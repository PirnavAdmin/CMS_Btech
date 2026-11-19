import { useEffect, useMemo, useRef, useState } from 'react'
import ViewDialog from '../../components/ViewDialog'
import { roleApi, userDirectoryApi } from '../../api/apiEndpoints'
import {
  getCollegeById,
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
import { SYSTEM_MODULES } from './systemPermissionModules.js'
import './AdminManagement.css'

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/
const PERSON_NAME_PATTERN = /^[\p{L}\p{M}\s.'’-]+$/u
const ORGANIZATION_NAME_PATTERN = /^[\p{L}\p{M}\d\s.,&'’()/-]+$/u
const ORGANIZATION_CODE_PATTERN = /^[A-Z0-9]{2,10}$/
const isValidIndianMobile = value => /^[6-9]\d{9}$/.test(String(value || '').trim())
const indianMobileError = value => !String(value || '').trim()
  ? 'Phone number is required.'
  : isValidIndianMobile(value) ? '' : 'Enter a 10-digit phone number starting with 6-9.'
const isActive = value => value === true || value === 1 || String(value).toLowerCase() === '1' || String(value).toLowerCase() === 'active'
const isCollegeAdmin = user => {
  const roles = [
    ...(Array.isArray(user.roleCodes) ? user.roleCodes : []),
    ...(Array.isArray(user.roles) ? user.roles : []),
    user.roleName,
  ].filter(Boolean).map(value => String(value).trim().toUpperCase().replace(/[\s-]+/g, '_'))
  return roles.some(role => role === 'COLLEGE_ADMIN' || role === 'COLLEGE_ADMINISTRATOR')
}
const userIdentifier = response => {
  const body = response?.data ?? response
  const record = body?.data ?? body?.user ?? body
  return record?.userId ?? record?.id ?? record?.user?.userId
}
const collegeAdminRoleFromLookups = lookups => {
  const roles = Array.isArray(lookups?.roles) ? lookups.roles : []
  return roles.find(item => {
    const roleCode = String(item.roleCode ?? item.code ?? '').toUpperCase()
    const roleName = String(item.roleName ?? item.name ?? '').toUpperCase()
    const isGlobal = item.collegeId == null || Number(item.collegeId) === 0
    return isGlobal && (roleCode === 'COLLEGE_ADMIN' || roleName === 'COLLEGE ADMIN' || roleName === 'COLLEGE ADMINISTRATOR')
  })
}
const roleIdentifier = lookups => {
  const role = collegeAdminRoleFromLookups(lookups)
  return role?.roleId ?? role?.id
}
const permissionDefaults = () => Object.fromEntries(SYSTEM_MODULES.map(module => [module.id, {
  view: true,
  create: true,
  edit: true,
  delete: false,
  export: true,
}]))
const asPermissionRows = value => Array.isArray(value) ? value : Array.isArray(value?.permissions) ? value.permissions : []
const applyPermissionRows = (base, rows) => rows.reduce((permissions, row) => {
  const moduleKey = row.moduleKey ?? row.ModuleKey
  if (!moduleKey || !SYSTEM_MODULES.some(module => module.id === moduleKey)) return permissions
  permissions[moduleKey] = {
    view: isActive(row.canView ?? row.CanView),
    create: isActive(row.canCreate ?? row.CanCreate),
    edit: isActive(row.canEdit ?? row.CanEdit),
    delete: isActive(row.canDelete ?? row.CanDelete),
    export: isActive(row.canExport ?? row.CanExport),
  }
  return permissions
}, { ...base })
const WIZARD_STEPS = [
  { id: 'organization', label: 'Organization', description: 'Identity and primary contact' },
  { id: 'permissions', label: 'Permissions', description: 'Initialize admin screen access' },
  { id: 'review', label: 'Review', description: 'Confirm and create' },
]

async function loadAllUsers() {
  const rows = []
  for (let pageNumber = 1; pageNumber <= 100; pageNumber += 1) {
    const page = await userDirectoryApi.getAll({ pageNumber, pageSize: 200 })
    rows.push(...page)
    if (page.length < 200) return rows
  }
  throw new Error('The user directory is too large to search safely. Narrow the administrator list in User Access Management.')
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
  })
  const [errors, setErrors] = useState({})
  const [submitError, setSubmitError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const submitLock = useRef(false)
  const [adminRoleId, setAdminRoleId] = useState(null)
  const [permissionGrants, setPermissionGrants] = useState(permissionDefaults)
  const [permissionLoading, setPermissionLoading] = useState(Boolean(editId))
  const [permissionLoadError, setPermissionLoadError] = useState('')
  const [permissionLoadAttempt, setPermissionLoadAttempt] = useState(0)
  const [activeStep, setActiveStep] = useState(0)
  const [highestUnlockedStep, setHighestUnlockedStep] = useState(0)
  const [createdCollegeId, setCreatedCollegeId] = useState(null)
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
        const collegeResponse = await getCollegeById(editId)
        if (!active) return
        const college = unwrapCollegeRecord(collegeResponse)
        originalCollegeRef.current = college
        const rawStatus = college.status ?? college.isActive
        const status = rawStatus == null || rawStatus === '' ? '1' : isActive(rawStatus) ? '1' : '0'
        originalStatusRef.current = status
        setValues({
          name: String(college.name ?? college.collegeName ?? ''),
          code: String(college.code ?? college.collegeCode ?? '').toUpperCase(),
          contactPerson: String(college.contactPerson ?? college.principalName ?? college.principal ?? ''),
          email: String(college.email ?? college.collegeEmail ?? ''),
          phone: String(college.contactNumber ?? college.phoneNumber ?? college.contact ?? ''),
          status,
        })
      } catch (error) {
        if (active) setFormLoadError(error?.message || 'Could not load the organization.')
      } finally {
        if (active) setFormLoading(false)
      }
    }
    loadOrganization()
    return () => { active = false }
  }, [editId])
  useEffect(() => {
    if (!editId || accessLoading) return undefined
    if (access?.isSuperAdmin !== true) {
      setPermissionLoading(false)
      return undefined
    }
    let active = true
    setPermissionLoading(true)
    setPermissionLoadError('')
    const loadPermissions = async () => {
      try {
        const roleId = roleIdentifier(await userDirectoryApi.lookups())
        if (!roleId) throw new Error('The global College Admin role is not available in role lookups.')
        if (!active) return
        setAdminRoleId(roleId)
        let scoped = []
        try {
          scoped = await roleApi.getCollegePermissions(roleId, editId)
        } catch (error) {
          if (Number(error?.status ?? error?.response?.status) !== 404) throw error
        }
        if (!active) return
        setPermissionGrants(applyPermissionRows(permissionDefaults(), asPermissionRows(scoped)))
      } catch (error) {
        if (active) setPermissionLoadError(error?.message || 'Could not load this organization’s College Admin permissions.')
      } finally {
        if (active) setPermissionLoading(false)
      }
    }
    loadPermissions()
    return () => { active = false }
  }, [editId, access?.isSuperAdmin, accessLoading, permissionLoadAttempt])

  const permissionGroups = useMemo(() => SYSTEM_MODULES.reduce((groups, module) => {
    if (!groups[module.category]) groups[module.category] = []
    groups[module.category].push(module)
    return groups
  }, {}), [])
  const activePermissionCount = SYSTEM_MODULES.reduce((count, module) =>
    count + Object.values(permissionGrants[module.id] || {}).filter(Boolean).length, 0)
  const adminsToSave = editId ? [] : [{
    id: 'organization-primary-admin',
    fullName: values.contactPerson.trim(),
    email: values.email.trim(),
    phone: values.phone.trim(),
  }]

  const updatePermission = (moduleId, actionId, checked) => {
    setPermissionGrants(current => {
      const module = current[moduleId] || { view: false, create: false, edit: false, delete: false, export: false }
      return {
        ...current,
        [moduleId]: {
          ...module,
          [actionId]: checked,
          ...(checked && actionId !== 'view' ? { view: true } : {}),
          ...(!checked && actionId === 'view' ? { create: false, edit: false, delete: false, export: false } : {}),
        },
      }
    })
    setErrors(current => ({ ...current, permissions: '' }))
    setSubmitError('')
  }

  const toggleModulePermissions = moduleId => {
    setPermissionGrants(current => {
      const module = current[moduleId] || {}
      const enabled = ['view', 'create', 'edit', 'delete', 'export'].every(action => Boolean(module[action]))
      return {
        ...current,
        [moduleId]: Object.fromEntries(['view', 'create', 'edit', 'delete', 'export'].map(action => [action, !enabled])),
      }
    })
    setErrors(current => ({ ...current, permissions: '' }))
    setSubmitError('')
  }

  const applyPermissionPreset = preset => {
    setPermissionGrants(Object.fromEntries(SYSTEM_MODULES.map(module => [module.id, {
      view: preset !== 'clear',
      create: preset === 'full' || preset === 'recommended',
      edit: preset === 'full' || preset === 'recommended',
      delete: preset === 'full',
      export: preset !== 'clear',
    }])))
    setErrors(current => ({ ...current, permissions: '' }))
    setSubmitError('')
  }

  const updateValue = (field, value) => {
    setValues(current => ({ ...current, [field]: value }))
    setErrors(current => ({ ...current, [field]: '' }))
    setSubmitError('')
  }
  const validatePhone = () => {
    const message = indianMobileError(values.phone)
    setErrors(current => ({ ...current, phone: message }))
    return !message
  }

  const validate = (scope = 'all') => {
    const fieldErrors = {}
    const organizationName = values.name.trim()
    const organizationCode = values.code.trim().toUpperCase()
    const contactPerson = values.contactPerson.trim()
    const email = values.email.trim()
    const checkOrganization = scope === 'all' || scope === 'setup' || scope === 'organization'
    const checkPermissions = scope === 'all' || scope === 'permissions'

    if (checkOrganization) {
      if (!organizationName) fieldErrors.name = 'Organization name is required.'
      else if (organizationName.length < 3 || organizationName.length > 30) fieldErrors.name = 'Use between 3 and 30 characters.'
      else if (!ORGANIZATION_NAME_PATTERN.test(organizationName)) fieldErrors.name = 'Use letters, numbers, spaces, and standard punctuation.'
      if (!organizationCode) fieldErrors.code = 'Organization code is required.'
      else if (!ORGANIZATION_CODE_PATTERN.test(organizationCode)) fieldErrors.code = 'Use 2-10 letters and numbers only.'
      if (!contactPerson) fieldErrors.contactPerson = 'Contact person is required.'
      else if (contactPerson.length < 2 || contactPerson.length > 30 || !PERSON_NAME_PATTERN.test(contactPerson)) fieldErrors.contactPerson = 'Enter a valid contact person name (2-30 letters).'
      if (!email) fieldErrors.email = 'Email is required.'
      else if (email.length > 254 || !EMAIL_PATTERN.test(email)) fieldErrors.email = 'Enter a valid email address (maximum 254 characters).'
      const phoneError = indianMobileError(values.phone)
      if (phoneError) fieldErrors.phone = phoneError
    }
    if (checkPermissions && !SYSTEM_MODULES.some(module => permissionGrants[module.id]?.view)) {
      fieldErrors.permissions = 'Grant View access to at least one screen so the College Admin can use this organization.'
    }

    if (scope === 'all') setErrors(fieldErrors)
    else {
      const keysToReplace = scope === 'setup' || scope === 'organization'
        ? ['name', 'code', 'contactPerson', 'email', 'phone']
        : ['permissions']
      setErrors(current => {
        const next = { ...current }
        keysToReplace.forEach(key => { delete next[key] })
        return { ...next, ...fieldErrors }
      })
    }
    return !Object.keys(fieldErrors).length
  }
  const goNext = () => {
    const current = WIZARD_STEPS[activeStep]
    if (current?.id === 'permissions' && (permissionLoading || permissionLoadError)) return
    if (!current || !validate(current.id === 'organization' ? 'setup' : current.id)) return
    setSubmitError('')
    setActiveStep(step => Math.min(WIZARD_STEPS.length - 1, step + 1))
    setHighestUnlockedStep(step => Math.min(WIZARD_STEPS.length - 1, Math.max(step, activeStep + 1)))
  }

  const goToStep = index => {
    if (submitting || index < 0 || index > highestUnlockedStep) return
    setActiveStep(index)
    setSubmitError('')
  }

  const submit = async () => {
    if (activeStep !== WIZARD_STEPS.length - 1) return
    if (submitting || submitLock.current || permissionLoading || permissionLoadError || !validate()) return
    if (access?.isSuperAdmin !== true) {
      setSubmitError(`Only the platform Super Admin can ${editId ? 'edit an organization' : 'create an organization'}.`)
      return
    }
    submitLock.current = true
    setSubmitting(true)
    setSubmitError('')
    let collegeId = editId || createdCollegeId
    let progress = { ...adminProgress }
    const organizationCode = values.code.trim().toUpperCase()
    try {
      if (editId) {
        const original = originalCollegeRef.current || {}
        const organization = {
          ...original,
          name: values.name.trim(),
          collegeName: values.name.trim(),
          code: organizationCode,
          collegeCode: organizationCode,
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
      }
      let collegeAdminRoleId = adminRoleId
      if (!collegeAdminRoleId) {
        collegeAdminRoleId = roleIdentifier(await userDirectoryApi.lookups())
        if (!collegeAdminRoleId) throw new Error('The global College Admin role is not available in role lookups.')
        setAdminRoleId(collegeAdminRoleId)
      }

      if (!editId && !collegeId) {
        if (creationUnconfirmed) throw new Error('Organization creation could not be confirmed. Refresh the Organization directory before trying again.')
        const latestResponse = await getColleges()
        const latestData = latestResponse?.data?.data ?? latestResponse?.data ?? latestResponse
        const rows = Array.isArray(latestData) ? latestData : Array.isArray(latestData?.items) ? latestData.items : []
        const normalized = value => String(value || '').trim().toLowerCase()
        const duplicate = rows.find(row =>
          normalized(row.code ?? row.collegeCode) === normalized(organizationCode)
          || normalized(row.name ?? row.collegeName) === normalized(values.name))
        if (duplicate) throw new Error('An organization with the same name or code already exists.')

        const primaryAdmin = adminsToSave[0]
        const permissions = SYSTEM_MODULES.map(module => {
          const grants = permissionGrants[module.id] || {}
          return {
            moduleKey: module.id,
            canView: Boolean(grants.view),
            canCreate: Boolean(grants.create),
            canEdit: Boolean(grants.edit),
            canDelete: Boolean(grants.delete),
            canExport: Boolean(grants.export),
          }
        })
        let response
        try {
          response = await userDirectoryApi.onboardCollege({
            collegeCode: organizationCode,
            collegeName: values.name.trim(),
            adminName: primaryAdmin.fullName,
            adminEmail: values.email.trim(),
            adminMobile: values.phone.trim(),
            email: values.email.trim(),
            mobile: values.phone.trim(),
            permissions,
          })
        } catch (error) {
          const invitation = error?.invitationFailure
          if (invitation) {
            const savedCollegeId = Number(invitation.collegeId)
            setCreatedCollegeId(savedCollegeId)
            setAdminProgress(current => ({
              ...current,
              [primaryAdmin.id]: { ...(current[primaryAdmin.id] || {}), userId: invitation.userId, assigned: true, invitationNeedsResend: true },
            }))
            rememberCreated('colleges', savedCollegeId)
          } else {
            const status = Number(error?.status ?? error?.response?.status)
            if (status === 0 || status >= 500) setCreationUnconfirmed(true)
          }
          throw error
        }
        const onboarding = response?.data?.data ?? response?.data ?? response
        collegeId = Number(onboarding?.collegeId)
        const adminUserId = Number(onboarding?.userId ?? userIdentifier(response))
        if (!Number.isSafeInteger(collegeId) || collegeId <= 0 || !Number.isSafeInteger(adminUserId) || adminUserId <= 0) {
          setCreationUnconfirmed(true)
          throw new Error('Organization and administrator were submitted, but the server did not confirm their IDs. Refresh the Organization directory before retrying.')
        }
        setCreatedCollegeId(collegeId)
        const current = { ...(progress[primaryAdmin.id] || {}), userId: adminUserId, assigned: true }
        progress = { ...progress, [primaryAdmin.id]: current }
        setAdminProgress(progress)
        rememberCreated('colleges', collegeId)
        const created = {
          ...onboarding,
          id: collegeId,
          collegeId,
          name: values.name.trim(),
          collegeName: values.name.trim(),
          code: organizationCode,
          collegeCode: organizationCode,
          email: values.email.trim(),
          contactNumber: values.phone.trim(),
          status: 'Active',
        }
        academicService?.registerNewCollege?.(created)
        academicService?.clearCache?.()
        eventBus.emit(ERP_EVENTS.ACADEMIC_UPDATED, { collegeId, college: created })
      }

      await roleApi.saveCollegePermissions(collegeAdminRoleId, collegeId, SYSTEM_MODULES.map(module => {
        const grants = permissionGrants[module.id] || {}
        return {
          moduleKey: module.id,
          canView: Boolean(grants.view),
          canCreate: Boolean(grants.create),
          canEdit: Boolean(grants.edit),
          canDelete: Boolean(grants.delete),
          canExport: Boolean(grants.export),
        }
      }))

      for (const row of adminsToSave) {
        const current = { ...(progress[row.id] || {}) }
        let userId = current.userId
        if (userId && current.invitationNeedsResend) {
          await userDirectoryApi.resendInvitation(userId)
          current.invitationNeedsResend = false
          progress = { ...progress, [row.id]: current }
          setAdminProgress(progress)
        }
        if (!userId) {
          if (current.invitationUnconfirmed) throw new Error(`The invitation for ${row.email} could not be confirmed. Refresh the user directory before retrying to avoid a duplicate account.`)
          let invitationError
          try {
            const response = await userDirectoryApi.create({
              collegeId,
              fullName: row.fullName,
              email: row.email,
              roleIds: [collegeAdminRoleId],
              mobile: row.phone,
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
              String(user.email || '').trim().toLowerCase() === row.email.toLowerCase()
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
      }
      if (!collegeStatusSaved && (editId
        ? String(values.status) !== String(originalStatusRef.current)
        : String(values.status) === '0')) {
        await updateCollegeStatus(collegeId, Number(values.status))
        setCollegeStatusSaved(true)
      } else if (!collegeStatusSaved) {
        setCollegeStatusSaved(true)
      }

      showSuccess(editId
        ? 'Organization updated successfully.'
        : `Organization and College Admin created. Setup link sent to ${values.email.trim()}.`)
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
        ? <textarea id={`college-create-${name}`} rows="3" maxLength={options.maxLength} value={values[name]} onChange={options.onChange || (event => updateValue(name, event.target.value))} onBlur={options.onBlur} aria-invalid={Boolean(errors[name])} aria-required={Boolean(options.required)} required={Boolean(options.required)} disabled={options.disabled} aria-describedby={errors[name] ? `college-create-${name}-error` : undefined} />
        : options.select
        ? <select id={`college-create-${name}`} value={values[name]} onChange={options.onChange || (event => updateValue(name, event.target.value))} onBlur={options.onBlur} aria-invalid={Boolean(errors[name])} aria-required={Boolean(options.required)} required={Boolean(options.required)} disabled={options.disabled} aria-describedby={errors[name] ? `college-create-${name}-error` : undefined}>
          {options.select.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
        </select>
        : <input id={`college-create-${name}`} type={type} maxLength={options.maxLength} inputMode={options.inputMode} autoComplete={options.autoComplete} value={values[name]} onChange={options.onChange || (event => updateValue(name, event.target.value))} onBlur={options.onBlur} aria-invalid={Boolean(errors[name])} aria-required={Boolean(options.required)} required={Boolean(options.required)} disabled={options.disabled} aria-describedby={errors[name] ? `college-create-${name}-error` : undefined} />}
      {options.hint && <small>{options.hint}</small>}
      {errors[name] && <small id={`college-create-${name}-error`} className="college-create-error" role="alert">{errors[name]}</small>}
    </div>
  )

  const form = <form className="college-create-form" onSubmit={event => { event.preventDefault(); if (activeStep < WIZARD_STEPS.length - 1) goNext() }} noValidate>
    {submitError && <div className="college-create-alert" role="alert">{submitError}{createdCollegeId && <span> Organization #{createdCollegeId} is already saved; {Object.values(adminProgress).some(item => item.invitationNeedsResend) ? 'retry to resend the setup link.' : 'retry to finish organization setup.'}</span>}{creationUnconfirmed && <span> Refresh the Organization directory before retrying to avoid a duplicate.</span>}</div>}
    {formLoading && <p role="status">Loading organization details…</p>}
    {formLoadError && <div className="college-create-alert" role="alert">{formLoadError}</div>}
    <nav className="college-create-stepper" aria-label="Organization setup steps">
      {WIZARD_STEPS.map((step, index) => <button
        key={step.id}
        type="button"
        className={`college-create-step${activeStep === index ? ' is-current' : ''}${index < activeStep ? ' is-complete' : ''}`}
        aria-current={activeStep === index ? 'step' : undefined}
        aria-label={`Step ${index + 1}: ${step.label}`}
        disabled={submitting || index > highestUnlockedStep}
        onClick={() => goToStep(index)}
      >
        <span className="college-create-step-number">{index < activeStep ? '✓' : index + 1}</span>
        <span className="college-create-step-copy"><strong>{step.label}</strong><small>{step.description}</small></span>
      </button>)}
    </nav>
    <section className="college-create-section" hidden={activeStep !== 0} aria-labelledby="college-create-contact-title">
      <header><div><h2 id="college-create-contact-title">Organization Details</h2><p>Organization identity and primary contact information</p></div></header>
      <div className="college-create-grid">
        {field('Organization Name', 'name', 'text', { required: true, maxLength: 30 })}
        {field('Organization Code', 'code', 'text', { required: true, maxLength: 10, onChange: event => updateValue('code', event.target.value.toUpperCase()) })}
        {field('Contact Person', 'contactPerson', 'text', { required: true, maxLength: 30 })}
        {field('Email', 'email', 'email', { required: true, maxLength: 254 })}
        {field('Phone Number', 'phone', 'tel', { required: true, inputMode: 'numeric', maxLength: 10, onChange: event => updateValue('phone', event.target.value.replace(/\D/g, '').slice(0, 10)), onBlur: validatePhone, hint: '10-digit Indian mobile number starting with 6-9.' })}
        {field('Status', 'status', 'text', { required: true, select: [{ value: '1', label: 'Active' }, { value: '0', label: 'Inactive' }] })}
      </div>
      <p className="college-create-note">{editId ? "Contact Person is saved to the organization's existing Principal field." : `A College Admin account will be created using this email. Its setup link will be sent to ${values.email || 'the email entered above'}.`}</p>

    </section>

    <section className="college-create-section college-create-permissions" hidden={activeStep !== 1} aria-labelledby="college-create-permissions-title">
      <header className="college-create-permissions-heading">
        <div><h2 id="college-create-permissions-title">College Admin Permissions</h2><p>Choose which screens the College Admin can access in this organization.</p></div>
        <span className="college-create-permission-count">{activePermissionCount} of {SYSTEM_MODULES.length * 5} grants</span>
      </header>
      {permissionLoading && <p className="college-create-note" role="status">Loading this organization’s permission settings…</p>}
      {permissionLoadError && <div className="college-create-alert" role="alert">{permissionLoadError}<button type="button" className="college-create-link" onClick={() => setPermissionLoadAttempt(value => value + 1)} disabled={permissionLoading}>Retry</button></div>}
      <div className="college-create-permission-presets" role="group" aria-label="Permission presets">
        <span>Start with</span>
        <button type="button" className="college-create-secondary" onClick={() => applyPermissionPreset('recommended')} disabled={permissionLoading || Boolean(permissionLoadError) || submitting}>Recommended</button>
        <button type="button" className="college-create-secondary" onClick={() => applyPermissionPreset('readOnly')} disabled={permissionLoading || Boolean(permissionLoadError) || submitting}>Read only</button>
        <button type="button" className="college-create-secondary" onClick={() => applyPermissionPreset('full')} disabled={permissionLoading || Boolean(permissionLoadError) || submitting}>Full access</button>
        <button type="button" className="college-create-link" onClick={() => applyPermissionPreset('clear')} disabled={permissionLoading || Boolean(permissionLoadError) || submitting}>Clear all</button>
      </div>
      <p className="college-create-note">Recommended access includes view, create, edit, and export. Delete stays off until you grant it.</p>
      {errors.permissions && <p className="college-create-error" role="alert">{errors.permissions}</p>}
      <div className="college-create-permission-groups">
        {Object.entries(permissionGroups).map(([category, modules]) => <section className="college-create-permission-group" key={category} aria-labelledby={`college-permission-${category.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}`}>
          <h3 id={`college-permission-${category.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}`}>{category}</h3>
          <div className="college-create-permission-table-wrap">
            <table className="college-create-permission-table">
              <thead><tr><th scope="col">Screen</th><th scope="col">View</th><th scope="col">Create</th><th scope="col">Edit</th><th scope="col">Delete</th><th scope="col">Export</th><th scope="col">Row</th></tr></thead>
              <tbody>{modules.map(module => <tr key={module.id}>
                <th scope="row"><span>{module.name}</span><small>{module.description}</small></th>
                {['view', 'create', 'edit', 'delete', 'export'].map(action => <td key={action}><input
                  type="checkbox"
                  aria-label={`${module.name} ${action}`}
                  checked={Boolean(permissionGrants[module.id]?.[action])}
                  onChange={event => updatePermission(module.id, action, event.target.checked)}
                  disabled={permissionLoading || Boolean(permissionLoadError) || submitting}
                /></td>)}
                <td><button type="button" className="college-create-link" onClick={() => toggleModulePermissions(module.id)} disabled={permissionLoading || Boolean(permissionLoadError) || submitting}>All</button></td>
              </tr>)}</tbody>
            </table>
          </div>
        </section>)}
      </div>
    </section>

    <section className="college-create-section college-create-review" hidden={activeStep !== 2} aria-labelledby="college-create-review-title">
      <header><div><h2 id="college-create-review-title">Review organization setup</h2><p>Confirm the organization details and initial screen access.</p></div></header>
      <div className="college-create-review-grid">
        <article><span>Organization</span><strong>{values.name || 'Name not entered'}</strong><small>{values.code || 'Code not entered'} · {values.status === '1' ? 'Active' : 'Inactive'}</small></article>
        <article><span>{editId ? 'Primary contact' : 'College Admin'}</span><strong>{values.contactPerson || 'Not provided'}</strong><small>{values.email || 'No email'}{values.phone ? ` · ${values.phone}` : ''}</small></article>
        <article><span>Initial permissions</span><strong>{activePermissionCount} grants across {SYSTEM_MODULES.length} screens</strong><small>Delete access is {SYSTEM_MODULES.some(module => permissionGrants[module.id]?.delete) ? 'enabled for selected screens' : 'off'}.</small></article>
      </div>
    </section>

    <footer className="college-create-footer">
      <div className="college-create-footer-start"><span>Step {activeStep + 1} of {WIZARD_STEPS.length}</span><button type="button" className="college-create-secondary" onClick={onDismiss} disabled={submitting}>Cancel</button></div>
      <div className="college-create-footer-actions">
        {activeStep > 0 && <button type="button" className="college-create-secondary" onClick={() => goToStep(activeStep - 1)} disabled={submitting}>Previous</button>}
        {activeStep < WIZARD_STEPS.length - 1
          ? <button type="button" className="college-create-primary" onClick={goNext} disabled={submitting || formLoading || permissionLoading && activeStep === 1 || Boolean(formLoadError) || Boolean(permissionLoadError && activeStep === 1)}>Continue</button>
          : <button type="button" className="college-create-primary" onClick={submit} disabled={submitting || creationUnconfirmed || formLoading || permissionLoading || Boolean(formLoadError) || Boolean(permissionLoadError)}>{submitting ? (editId ? 'Saving Organization…' : 'Creating Organization…') : submitLabel}</button>}
      </div>
    </footer>
  </form>

  return <ViewDialog title={formTitle} subtitle={editId ? 'Update organization information' : 'Create an organization and configure its College Admin'} className="college-create-dialog" maxWidth="1040px" onClose={onDismiss} busy={submitting} showExport={false} hideFooter>
    {form}
  </ViewDialog>
}
