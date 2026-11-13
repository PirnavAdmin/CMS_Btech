import { useCallback, useEffect, useRef, useState } from 'react'
import { FiMail, FiPlus, FiRefreshCw, FiSearch, FiX } from 'react-icons/fi'
import ViewDialog from '../../components/ViewDialog.jsx'
import DashboardLayout from '../../layouts/DashboardLayout.jsx'
import { roleApi, userDirectoryApi } from '../../api/apiEndpoints.js'
import './UserAccessManagement.css'
import { canResendInvitation, isPendingInvitation, resolveOnboardingConflict } from './invitationRecovery.js'
import { inviteCollegeAccount, readAccountDetails, readDirectoryPages } from '../../services/clientOnboardingService'
import { useScreenAccess } from '../../auth/ScreenAccess'
import AccountAccessDialog from './AccountAccessDialog'
import ExportMenu from '../../components/ExportMenu'
import TablePagination from '../../components/TablePagination'

const blankForm = { fullName: '', email: '', mobile: '', collegeName: '', collegeCode: '', collegeType: 'Engineering', universityName: '', collegeEmail: '', collegeMobile: '', addressLine1: '', city: '', state: '', pincode: '' }
const pendingInvitation = row => ['Pending Invitation', 'Not Created', 'Sending'].includes(row.invitationStatus)
const matchesInvitationStatus = (row, status) => {
  if (!status) return true
  if (status === 'Pending') return pendingInvitation(row)
  if (status === 'Sent') return row.emailStatus === 'Accepted'
  if (status === 'Failed') return row.emailStatus === 'Failed' || row.invitationStatus === 'Email Failed'
  return row.invitationStatus === status
}
const actionLabels = { activate: 'Activate', deactivate: 'Suspend', reset: 'Send password setup link to', resend: 'Resend invitation to' }
const statuses = ['Active', 'Pending Invitation', 'Profile Pending', 'Expired', 'Suspended', 'Deactivated']
const initials = name => String(name || '?').split(/\s+/).filter(Boolean).slice(0, 2).map(part => part[0]).join('').toUpperCase()
const date = value => {
  if (!value) return 'Not available'
  const raw = String(value), timestamp = /(Z|[+-]\d{2}:?\d{2})$/i.test(raw) ? raw : raw + 'Z'
  return Number.isNaN(Date.parse(timestamp)) ? 'Not available' : new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Kolkata' }).format(new Date(timestamp))
}

export function UserForm({ onClose, onSave, saving, recovery, onClearRecovery, onView, onResend, sending, actionError, actionNotice, allowResend = true }) {
  const [step, setStep] = useState(0)
  const [form, setForm] = useState(() => ({ ...blankForm }))
  const [error, setError] = useState('')
  const [deliveryFailure, setDeliveryFailure] = useState(null)
  const [collegeMode, setCollegeMode] = useState('existing')
  const [lookups, setLookups] = useState(null)
  const [lookupError, setLookupError] = useState('')
  const [lookupAttempt, setLookupAttempt] = useState(0)
  useEffect(() => {
    if (collegeMode !== 'existing' || step !== 1) return
    let active = true
    userDirectoryApi.lookups().then(value => {
      if (!Array.isArray(value?.colleges) || !Array.isArray(value?.roles)) throw new Error('College and role options could not be verified.')
      if (active) setLookups(value)
    }).catch(reason => { if (active) setLookupError(reason.message) })
    return () => { active = false }
  }, [collegeMode, lookupAttempt, step])
  const selectedCollege = lookups?.colleges.find(row => String(row.collegeId) === String(form.collegeId))
  const availableRoles = lookups?.roles.filter(row => !row.collegeId || String(row.collegeId) === String(form.collegeId)) || []
  const selectedRole = availableRoles.find(row => String(row.roleId) === String(form.roleId))
  const patch = values => { onClearRecovery?.(); setForm(current => ({ ...current, ...values })) }
  const submit = async event => {
    event.preventDefault()
    if (saving || sending) return
    setError('')
    if (step === 0 && (!form.fullName.trim() || !/^\+?[0-9]{7,14}$/.test(form.mobile.trim()))) {
      setError('Enter a name and a mobile number with 7–14 digits and an optional leading +.')
      return
    }
    if (collegeMode === 'existing' && ((step === 1 && !selectedCollege) || (step > 1 && (!selectedCollege || !selectedRole)))) {
      setError(step === 1 ? 'Select a verified college.' : 'Select an eligible role.')
      return
    }
    if (step < 3) { setStep(step + 1); return }
    try {
      await onSave({
        ...form,
        ...(collegeMode === 'existing'
          ? { collegeId: selectedCollege.collegeId, roleId: selectedRole.roleId, collegeCode: selectedCollege.collegeCode, collegeName: selectedCollege.collegeName }
          : { collegeId: undefined, roleId: undefined }),
        fullName: form.fullName.trim(), email: form.email.trim(), mobile: form.mobile.trim(),
        collegeName: collegeMode === 'existing' ? selectedCollege.collegeName : form.collegeName.trim(),
        collegeCode: collegeMode === 'existing' ? selectedCollege.collegeCode : form.collegeCode.trim().toUpperCase(),
        collegeEmail: form.collegeEmail.trim(), collegeMobile: form.collegeMobile.trim(),
        addressLine1: form.addressLine1.trim(), city: form.city.trim(), state: form.state.trim(), pincode: form.pincode.trim(),
      })
    } catch (reason) {
      setDeliveryFailure(reason.invitationFailure || (reason.creationUnconfirmed ? {} : null))
      setError(reason.message || 'Could not save this invitation.')
    }
  }
  const stepNames = ['User Details', 'College Assignment', 'Role & Permissions', 'Review & Invite']
  const busy = saving || sending
  return <ViewDialog title="Add User" onClose={onClose} busy={busy} showExport={false} maxWidth="760px"
    className="user-access-wizard" footerContent={<>
      <button type="button" disabled={busy} className="user-directory__button" onClick={step ? () => { setError(''); setStep(step - 1) } : onClose}>{step ? 'Back' : 'Cancel'}</button>
      <button type="submit" form="user-invitation-form" className="user-directory__button user-directory__button--primary"
        disabled={busy || (step === 3 && (Boolean(recovery) || Boolean(deliveryFailure)))}>
        {saving ? 'Sending…' : step < 3 ? 'Next' : 'Send Invitation'}
      </button>
    </>}>
    <section className="user-directory__dialog-content user-directory__form-dialog">
    <form id="user-invitation-form" onSubmit={submit}>
    <ol className="user-directory__wizard-steps" aria-label="Invitation progress">{stepNames.map((name, index) =>
      <li key={name}><button type="button" aria-current={step === index ? 'step' : undefined}
        disabled={busy || index > step} className={step === index ? 'is-active' : step > index ? 'is-complete' : ''}
        onClick={() => { setError(''); setStep(index) }}><b>{index + 1}</b>{name}</button></li>)}</ol>
    {step === 0 && <fieldset><legend>Personal Information</legend><div className="user-directory__form-grid"><label>Full Name<input required maxLength="150" value={form.fullName} onChange={event => patch({ fullName: event.target.value })} /></label><label>Official Email Address<input required type="email" maxLength="150" value={form.email} onChange={event => patch({ email: event.target.value })} /></label><label>Mobile Number<input required type="tel" inputMode="tel" maxLength="15" value={form.mobile} onChange={event => patch({ mobile: event.target.value })} /></label></div></fieldset>}
    {step === 1 && <fieldset><legend>College setup</legend>
      <label>College setup<select value={collegeMode} onChange={event => { setCollegeMode(event.target.value); setLookupError(''); patch({ collegeId: '', roleId: '' }) }}><option value="new">New College</option><option value="existing">Existing College</option></select></label>
      {collegeMode === 'existing' && <div className="user-directory__form-grid">
        {!lookups && !lookupError && <p role="status">Loading colleges and roles…</p>}
        {lookupError && <p role="alert">{lookupError} <button type="button" onClick={() => { setLookupError(''); setLookupAttempt(value => value + 1) }}>Retry options</button></p>}
        <label>Existing College<select required value={form.collegeId || ''} disabled={!lookups} onChange={event => patch({ collegeId: event.target.value, roleId: '' })}><option value="">Select college</option>{lookups?.colleges.map(row => <option key={row.collegeId} value={row.collegeId}>{row.collegeName}</option>)}</select></label>
      </div>}
    </fieldset>}
    {step === 2 && <fieldset><legend>Role & Permissions</legend>
      {collegeMode === 'existing' ? <div className="user-directory__form-grid">
        <label>Access Role<select required value={form.roleId || ''} disabled={!selectedCollege} onChange={event => patch({ roleId: event.target.value })}><option value="">Select role</option>{availableRoles.map(row => <option key={row.roleId} value={row.roleId}>{row.roleName}</option>)}</select></label>
      </div> : <p>College Administrator</p>}
      <p className="user-directory__hint">Accounts inherit permissions from their role. Use Access Control to manage account-specific module overrides after creation.</p>
    </fieldset>}
    {step === 1 && collegeMode === 'new' && <fieldset><legend>New College Details</legend><div className="user-directory__form-grid"><label>College Name<input required maxLength="200" value={form.collegeName} onChange={event => patch({ collegeName: event.target.value })} /></label><label>College Code<input required maxLength="12" pattern="[A-Za-z0-9]{2,12}" title="Use 2 to 12 letters or numbers." value={form.collegeCode} onChange={event => patch({ collegeCode: event.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '') })} /></label><label>College Type<select required value={form.collegeType} onChange={event => patch({ collegeType: event.target.value })}><option>Engineering</option><option>Degree</option><option>Management</option><option>Medical</option><option>Other</option></select></label><label>University Name<input required maxLength="200" value={form.universityName} onChange={event => patch({ universityName: event.target.value })} /></label><label>College Email<input type="email" maxLength="150" value={form.collegeEmail} onChange={event => patch({ collegeEmail: event.target.value })} /></label><label>College Contact Number<input maxLength="20" value={form.collegeMobile} onChange={event => patch({ collegeMobile: event.target.value })} /></label><label>Address<input required maxLength="255" value={form.addressLine1} onChange={event => patch({ addressLine1: event.target.value })} /></label><label>City<input required maxLength="100" value={form.city} onChange={event => patch({ city: event.target.value })} /></label><label>State<input required maxLength="100" value={form.state} onChange={event => patch({ state: event.target.value })} /></label><label>Pincode<input required maxLength="10" inputMode="numeric" value={form.pincode} onChange={event => patch({ pincode: event.target.value })} /></label></div></fieldset>}    {step === 3 && <fieldset><legend>Review & Send Invitation</legend><dl className="user-directory__review"><dt>Full name</dt><dd>{form.fullName || '—'}</dd><dt>Sign-in email</dt><dd>{form.email || '—'}</dd><dt>Mobile</dt><dd>{form.mobile || '—'}</dd><dt>College</dt><dd>{collegeMode === 'existing' ? selectedCollege?.collegeName : form.collegeName || '—'} ({collegeMode === 'existing' ? selectedCollege?.collegeCode : form.collegeCode || '—'})</dd><dt>University</dt><dd>{form.universityName || '—'}</dd><dt>Initial role</dt><dd>{collegeMode === 'existing' ? selectedRole?.roleName : 'College Administrator'}</dd></dl><p className="user-directory__hint"><FiMail /> {collegeMode === 'existing' ? 'The account will be assigned to the selected college and role.' : 'The college and its administrator account will be created together.'} Review the invitation record for password setup and email status.</p></fieldset>}    {error && <p className="user-directory__error" role="alert">{error}</p>}{step === 3 && recovery && <div className="user-directory__recovery">{actionError && <p role="alert">{actionError}</p>}{actionNotice && <p role="status">{actionNotice}</p>}<p>An onboarding record already exists for this administrator or college. Review the existing invitation before continuing.</p><button type="button" className="user-directory__button" onClick={() => onView(recovery)}>View Existing Invitation</button><button type="button" className="user-directory__button user-directory__button--primary" disabled={sending || !allowResend || !canResendInvitation(recovery)} onClick={() => onResend(recovery)}>{sending ? 'Sending…' : 'Resend Invitation'}</button></div>}  </form></section></ViewDialog>
}

function EditUserForm({ user, onClose, onSave, saving }) {
  const [form, setForm] = useState({ fullName: user.fullName || '', email: user.email || '', mobile: user.mobile || '', designation: user.designation || '' })
  const [error, setError] = useState('')
  const [roleOptions, setRoleOptions] = useState(null)
  const [roleError, setRoleError] = useState('')
  const [selectedRoleId, setSelectedRoleId] = useState('')
  useEffect(() => {
    let current = true
    userDirectoryApi.lookups(user.collegeId).then(value => {
      if (!Array.isArray(value?.roles)) throw new Error('Role options could not be verified.')
      if (current) setRoleOptions(value.roles.filter(row => !row.collegeId || String(row.collegeId) === String(user.collegeId)))
    }).catch(reason => { if (current) setRoleError(reason.message) })
    return () => { current = false }
  }, [user.collegeId])
  const patch = event => setForm(current => ({ ...current, [event.target.name]: event.target.value }))
  const submit = async event => {
    event.preventDefault()
    setError('')
    try {
      let roleIds = (user.roleIds?.length ? user.roleIds : [user.roleId])
        .map(value => Number(value))
        .filter(value => Number.isInteger(value) && value > 0)
      if (selectedRoleId) {
        const selected = roleOptions?.find(row => String(row.roleId) === selectedRoleId)
        if (!selected) throw new Error('Choose an eligible role for this account’s college.')
        roleIds = [Number(selected.roleId)]
      }

      // Some directory responses provide the role name for display but omit its ID.
      // Resolve that name against the roles API so the update DTO gets the required IDs.
      if (!roleIds.length && user.roleName) {
        const normalize = value => String(value || '').toLowerCase().replace(/[^a-z0-9]/g, '')
        const wanted = normalize(user.roleName.split(',')[0])
        const roles = await roleApi.getAll()
        const match = roles.find(role => {
          const name = role.roleName ?? role.RoleName ?? role.name ?? role.Name
          const code = role.roleCode ?? role.RoleCode ?? role.code ?? role.Code
          const normalizedName = normalize(name)
          const normalizedCode = normalize(code)
          return normalizedName === wanted || normalizedCode === wanted ||
            (wanted === 'collegeadmin' && ['collegeadministrator', 'collegeadmin'].includes(normalizedName))
        })
        const resolvedId = Number(match?.roleId ?? match?.RoleId ?? match?.role_id ?? match?.Role_id ?? match?.id ?? match?.Id)
        if (Number.isInteger(resolvedId) && resolvedId > 0) roleIds = [resolvedId]
      }

      if (!roleIds.length) throw new Error('Could not determine this account’s role ID. Refresh the user list and try again.')

      await onSave({
        collegeId: Number(user.collegeId), departmentId: user.departmentId ? Number(user.departmentId) : null,
        roleId: roleIds[0], roleIds, employeeUserId: user.employeeUserId || undefined,
        fullName: form.fullName.trim(), email: form.email.trim(), mobile: form.mobile.trim(),
        academicYearIds: user.academicYearIds || [], permissions: user.permissions,
      })
    } catch (reason) { setError(reason.message || 'Could not update this account.') }
  }
  return <ViewDialog title={`Edit ${user.fullName}`} subtitle="Update account details" onClose={onClose} busy={saving} showExport={false} hideFooter maxWidth="760px"><section className="user-directory__dialog-content user-directory__form-dialog"><header><div><span className="user-directory__eyebrow">Update account details</span><h2 id="edit-user-title">Edit {user.fullName}</h2></div><button className="user-directory__icon-button" type="button" onClick={onClose} aria-label="Close"><FiX /></button></header><form onSubmit={submit}><fieldset><legend>Account details</legend><div className="user-directory__form-grid"><label>Full Name<input name="fullName" required maxLength="150" value={form.fullName} onChange={patch} /></label><label>Sign-in Email<input name="email" type="email" required maxLength="150" value={form.email} onChange={patch} /></label><label>Mobile Number<input name="mobile" required maxLength="15" value={form.mobile} onChange={patch} /></label><label>Designation<input name="designation" readOnly value={form.designation} disabled /></label><label>Replace account role<select aria-label="Replace account role" value={selectedRoleId} disabled={!roleOptions || saving} onChange={event => setSelectedRoleId(event.target.value)}><option value="">Keep existing roles</option>{roleOptions?.map(row => <option key={row.roleId} value={row.roleId}>{row.roleName}</option>)}</select></label>{roleError && <p role="alert">{roleError} Existing role assignments will be preserved.</p>}</div></fieldset>{error && <p className="user-directory__error" role="alert">{error}</p>}<footer><button type="button" className="user-directory__button" onClick={onClose}>Cancel</button><button className="user-directory__button user-directory__button--primary" disabled={saving}>{saving ? 'Saving...' : 'Save and send setup link'}</button></footer></form></section></ViewDialog>
}

export function UserDirectory({ initialOnboarding = false }) {
  const { canAction, access, loading: accessLoading } = useScreenAccess()
  const platformAccess = access?.isSuperAdmin === true
  const canCreate = platformAccess && canAction('/user-access', 'create')
  const canEdit = platformAccess && canAction('/user-access', 'edit')
  const canExport = platformAccess && canAction('/user-access', 'export')
  const [accessUser, setAccessUser] = useState(null)
  const [confirmation, setConfirmation] = useState(null)
  const [busyUsers, setBusyUsers] = useState([])
  const accountActions = useRef(new Set())
  const loadGeneration = useRef(0)
  const activityGeneration = useRef(0)
  const [users, setUsers] = useState([]), [loading, setLoading] = useState(true), [saving, setSaving] = useState(false), [error, setError] = useState(''), [accountLoadError, setAccountLoadError] = useState(''), [notice, setNotice] = useState('')
  const [search, setSearch] = useState(''), [tab, setTab] = useState('Users'), [college, setCollege] = useState(''), [role, setRole] = useState(''), [status, setStatus] = useState(''), [editing, setEditing] = useState(initialOnboarding ? {} : null), [activity, setActivity] = useState(null)
  const [page, setPage] = useState(1), [pageSize, setPageSize] = useState(10)
  const [invitations, setInvitations] = useState([]), [invitationError, setInvitationError] = useState(''), [recovery, setRecovery] = useState(null), [viewingInvitation, setViewingInvitation] = useState(null), [sendingIds, setSendingIds] = useState([])
  const sendingRef = useRef(new Set())
  const onboardingRef = useRef(false)
  const onboardingRequests = useRef(new Set())
  const accountEditRef = useRef(false)
  const change = (setter, value) => { setter(value); setPage(1) }
  const load = useCallback(async () => {
    if (!platformAccess) return
    const generation = ++loadGeneration.current
    setLoading(true); setError(''); setAccountLoadError(''); setInvitationError('');
    const [accounts, invitationsResult] = await Promise.allSettled([
      readDirectoryPages(userDirectoryApi.getAll, 'userId'),
      readDirectoryPages(userDirectoryApi.invitations, 'invitationId', 1000),
    ]);
    if (generation !== loadGeneration.current) return
    if (accounts.status === 'fulfilled') setUsers(accounts.value); else { setUsers([]); setAccountLoadError(accounts.reason.message || 'Users could not be loaded.'); }
    if (invitationsResult.status === 'fulfilled') setInvitations(invitationsResult.value); else { setInvitations([]); setInvitationError(invitationsResult.reason.message || 'Invitation records could not be loaded.'); }
    setLoading(false);
  }, [platformAccess])
  useEffect(() => { load(); return () => { loadGeneration.current++ } }, [load])
  const invitationView = tab === 'Invitations'
  const accessView = tab === 'Access Control'
  const query = search.trim().toLowerCase()
  const matches = row =>
    (!query || [row.fullName, row.email, row.mobile, row.employeeUserId, row.userId, row.collegeName].some(value => String(value || '').toLowerCase().includes(query))) &&
    (!college || String(row.collegeId) === college) && (!role || row.roleName === role)
  const visible = users.filter(row => matches(row) && (!status || row.accountStatus === status))
  const matchingInvitations = invitations.filter(row => matches(row) && matchesInvitationStatus(row, status))
  const directoryRows = invitationView ? matchingInvitations : visible
  const pageCount = Math.max(1, Math.ceil(directoryRows.length / pageSize))
  const currentPage = Math.min(page, pageCount)
  const paginatedUsers = visible.slice((currentPage - 1) * pageSize, currentPage * pageSize)
  const paginatedInvitations = matchingInvitations.slice((currentPage - 1) * pageSize, currentPage * pageSize)
  const firstVisible = directoryRows.length ? (currentPage - 1) * pageSize + 1 : 0
  const lastVisible = Math.min(currentPage * pageSize, directoryRows.length)
  const collegeOptions = [...new Map([...users, ...invitations].filter(row => row.collegeId).map(row => [String(row.collegeId), row.collegeName || String(row.collegeId)])).entries()]
  const roleOptions = [...new Set([...users, ...invitations].map(row => row.roleName).filter(Boolean))]
  const statusOptions = invitationView ? [...new Set(['Pending', 'Sent', 'Failed', 'Expired', 'Accepted', ...invitations.map(row => row.invitationStatus).filter(Boolean)])] : statuses
  const counts = Object.fromEntries(statuses.map(item => [item, users.filter(user => user.accountStatus === item).length]))
  const save = async payload => {
    if (!canCreate || onboardingRef.current) return;
    const requestKey = `${payload.collegeId || payload.collegeCode}:${payload.email.toLowerCase()}`
    if (onboardingRequests.current.has(requestKey)) throw Object.assign(new Error('A previous account request may already be saved. Review the directory and invitation history before another creation.'), { creationUnconfirmed: true })
    if (!accountLoadError && users.some(user => String(user.email || '').trim().toLowerCase() === payload.email.toLowerCase())) {
      throw new Error('An account already uses this email. Find it in Users to manage its access.')
    }
    onboardingRef.current = true;
    setSaving(true); setRecovery(null); setError(''); setNotice('');
    try {
      onboardingRequests.current.add(requestKey)
      const college = { collegeName: payload.collegeName, collegeCode: payload.collegeCode, collegeType: payload.collegeType, universityName: payload.universityName, email: payload.collegeEmail || null, mobile: payload.collegeMobile || null, addressLine1: payload.addressLine1, city: payload.city, state: payload.state, pincode: payload.pincode, country: 'India' };
      const result = payload.collegeId ? await inviteCollegeAccount(payload) : await userDirectoryApi.onboardCollege({ ...college, ...Object.fromEntries(Object.entries(college).map(([key, value]) => [key[0].toUpperCase() + key.slice(1), value])), college, adminName: payload.fullName, adminFullName: payload.fullName, adminEmail: payload.email, adminMobile: payload.mobile });
      setNotice(result.message || 'Onboarding saved. Review the invitation email status below.'); setEditing(null); await load();
    } catch (reason) {
      if (reason.status >= 400 && reason.status < 500 && ![408, 409].includes(reason.status)) onboardingRequests.current.delete(requestKey)
      // A conflict, provider error or lost response may follow a committed transaction.
      // Fetch authoritative associations; never resend/reset on an email-only match.
      try {
      const records = await readDirectoryPages(userDirectoryApi.invitations, 'invitationId', 1000); setInvitations(records);
        const result = resolveOnboardingConflict(records, payload, reason.invitationFailure);
        if (result.match) { setRecovery(result.match); setTab('Invitations'); setStatus(''); setPage(1); throw Object.assign(new Error(reason.invitationFailure ? reason.message : 'An onboarding record already exists for this administrator or college. Review the existing invitation before continuing.'), { recovered: true, invitationFailure: reason.invitationFailure }); }
        if (result.conflict) throw Object.assign(new Error(result.conflict), { recovered: true, invitationFailure: reason.invitationFailure });
      } catch (lookupError) {
        if (lookupError.recovered) throw lookupError;
        setInvitationError('Existing invitations could not be verified. Refresh Invitations before trying onboarding again.');
      }
      if (onboardingRequests.current.has(requestKey)) reason.creationUnconfirmed = true
      throw reason;
    } finally { onboardingRef.current = false; setSaving(false); }
  }
  const saveEdit = async payload => {
    if (!canEdit || !editing?.userId || accountEditRef.current) return
    accountEditRef.current = true
    const userId = editing.userId
    setSaving(true)
    setError('')
    setNotice('')
    try {
      await userDirectoryApi.update(userId, payload)
    } catch (reason) {
      accountEditRef.current = false
      setSaving(false)
      setError(reason.message || 'Could not update this account.')
      throw reason
    }
    setEditing(null)
    setNotice('Account details saved.')
    let setupError = ''
    try {
      const result = await userDirectoryApi.resetPassword(userId)
      setNotice(`Account details saved. ${result?.message || 'Password setup request completed. Review account activity for email status.'}`)
    } catch (reason) {
      setupError = `Account details were saved. The password setup request could not be confirmed. Use the account setup action to retry. ${reason.message || ''}`
    }
    try {
      await load()
      if (setupError) setError(current => [current, setupError].filter(Boolean).join(' '))
    } finally { accountEditRef.current = false; setSaving(false) }
  }
  const resend = async invitation => {
    const id = invitation.invitationId;
    if (!canEdit || !canResendInvitation(invitation) || sendingRef.current.has(id)) return;
    sendingRef.current.add(id); setSendingIds([...sendingRef.current]); setError(''); setNotice('');
    try {
      const result = await userDirectoryApi.resendInvitation(invitation.userId);
      setNotice(result.message || 'Resend request completed. Review the updated email status; inbox delivery is not confirmed.');
    } catch (reason) { setError(reason.message || 'Invitation email could not be confirmed.'); }
    finally {
      try {
        const records = await readDirectoryPages(userDirectoryApi.invitations, 'invitationId', 1000); setInvitations(records);
        setRecovery(current => current ? records.find(row => String(row.invitationId) === String(current.invitationId) && isPendingInvitation(row)) || null : null);
        setViewingInvitation(current => current ? records.find(row => String(row.invitationId) === String(current.invitationId)) || current : null);
      } catch (reason) { setInvitationError(reason.message || 'Could not refresh invitation status.'); }
      sendingRef.current.delete(id); setSendingIds([...sendingRef.current]);
    }
  };
  const action = async (user, type, confirmed = false) => {
    if (!canEdit || accountActions.current.has(user.userId)) return
    if (!Object.hasOwn(actionLabels, type)) return
    if (!confirmed) { setError(''); setConfirmation({ user, type }); return }
    if (type === 'resend') {
      if (invitationError) return
      const invitation = invitations.find(row => String(row.userId) === String(user.userId) && String(row.collegeId) === String(user.collegeId));
      if (invitation) { if (canResendInvitation(invitation)) { setConfirmation(null); await resend(invitation) } return }
      if (!['Pending Invitation', 'Expired'].includes(user.accountStatus)) return
    }
    accountActions.current.add(user.userId); setBusyUsers([...accountActions.current]); setError('')
    try {
      const result = type === 'reset' ? await userDirectoryApi.resetPassword(user.userId) : type === 'resend' ? await userDirectoryApi.resendInvitation(user.userId) : await userDirectoryApi.setStatus(user.userId, type === 'activate' ? 1 : 0)
      setConfirmation(null)
      setNotice(result?.message || (['reset', 'resend'].includes(type) ? 'Password setup request completed. Review account activity for email status.' : 'Account status saved.'))
      await load()
    } catch (reason) { setError(reason.message || 'Account action failed.') }
    finally { accountActions.current.delete(user.userId); setBusyUsers([...accountActions.current]) }
  }
  const openActivity = async user => {
    const generation = ++activityGeneration.current
    setActivity({ user, rows: null, details: null, error: '' })
    const [audit, details] = await Promise.allSettled([
      readDirectoryPages(params => userDirectoryApi.activity(user.userId, params), 'auditId'), readAccountDetails(user),
    ])
    if (generation !== activityGeneration.current) return
    setActivity({
      user,
      rows: audit.status === 'fulfilled' ? audit.value : [],
      details: details.status === 'fulfilled' ? details.value : null,
      error: [audit, details].filter(result => result.status === 'rejected').map(result => result.reason.message).join(' '),
    })
  }
  const directoryError = invitationView ? invitationError : accountLoadError
  const counters = [
    ['Total Users', users.length, accountLoadError], ['Active', counts.Active, accountLoadError],
    ['Pending Invitations', invitations.filter(pendingInvitation).length, invitationError],
    ['Suspended', counts.Suspended, accountLoadError],
  ]
  const exportColumns = (invitationView
    ? [['fullName','User'],['email','Email'],['collegeName','College'],['roleName','Role'],['invitationStatus','Invitation Status'],['emailStatus','Email Status']]
    : [['fullName','User'],['email','Email'],['employeeUserId','Employee ID'],['userId','User ID'],['collegeName','College'],['departmentName','Department'],['roleName','Role'],['accountStatus','Status'],['lastLoginAt','Last Login']]
  ).map(([key, label]) => ({ key, label }))
  return <main className="user-directory">
    <header className="user-directory__header">
      <div><h1>User Access Management</h1><p>Manage users, invitations, college assignments and permissions.</p></div>
      <button type="button" className="user-directory__button user-directory__button--primary" disabled={!canCreate} onClick={() => setEditing({})}><FiPlus aria-hidden="true" /> Add User</button>
    </header>
    {accessLoading && <p role="status">Checking administrative access…</p>}
    {!accessLoading && !platformAccess && <p role="status">User Access Management requires a verified Super Admin account.</p>}
    {platformAccess && <>
    <dl className="user-directory__stats" aria-label="Account summary">
      {counters.map(([label, value, failure]) => <div key={label}><dt>{label}</dt><dd>{loading ? '—' : failure ? 'Unavailable' : value}</dd></div>)}
    </dl>
    {notice && <div className="user-directory__notice" role="status">{notice}<button onClick={() => setNotice('')} aria-label="Dismiss"><FiX /></button></div>}
    {(error || accountLoadError) && <div className="user-directory__error" role="alert">{error || accountLoadError}<button className="user-directory__button" onClick={load}>Retry</button></div>}
    <nav className="user-directory__tabs" aria-label="User access views">
      {['Users', 'Invitations', 'Access Control'].map(item => <button key={item} type="button" aria-current={tab === item ? 'page' : undefined}
        className={tab === item ? 'is-active' : ''} onClick={() => { change(setTab, item); setStatus('') }}>{item}</button>)}
    </nav>
    <section className="user-directory__panel" aria-label={tab}>
      {accessView && <p className="user-directory__hint">Choose an account to manage its college-scoped module permissions.</p>}
      <div className="user-directory__filters">
        <label className="user-directory__search"><FiSearch /><input aria-label="Search users and invitations" placeholder="Search name, email, or employee ID" value={search} onChange={event => change(setSearch, event.target.value)} /></label>
        <label>College<select value={college} onChange={event => change(setCollege, event.target.value)}><option value="">All colleges</option>{collegeOptions.map(([id,name]) => <option key={id} value={id}>{name}</option>)}</select></label>
        <label>Role<select value={role} onChange={event => change(setRole,event.target.value)}><option value="">All roles</option>{roleOptions.map(name => <option key={name}>{name}</option>)}</select></label>
        <label>Status<select value={status} onChange={event => change(setStatus,event.target.value)}><option value="">Any status</option>{statusOptions.map(item => <option key={item}>{item}</option>)}</select></label>
        {canExport && !directoryError && <ExportMenu rows={directoryRows} columns={exportColumns} title={invitationView ? 'Invitations' : 'User Directory'} filename={invitationView ? 'invitations' : 'users'} loading={loading} scope="All matching records" />}
        <button type="button" className="user-directory__icon-button" onClick={load} aria-label="Refresh directory" disabled={loading}><FiRefreshCw aria-hidden="true" /></button>
      </div>
      {invitationView
        ? <InvitationTable invitations={paginatedInvitations} canEdit={canEdit} showAll loading={loading} error={invitationError} onView={setViewingInvitation} onResend={resend} sendingIds={sendingIds} />
        : loading ? <p className="user-directory__loading" role="status">Loading accounts…</p>
        : accountLoadError ? null
        : <div className="user-directory__table-wrap"><table>
          <thead><tr>{['User', 'Employee / User ID', 'College', 'Role', 'Department', 'Account Status', 'Last Login', 'Actions'].map(label => <th key={label} scope="col">{label}</th>)}</tr></thead>
          <tbody>{paginatedUsers.map(user => {
            const busy = busyUsers.includes(user.userId)
            const invitation = invitations.find(row => String(row.userId) === String(user.userId) && String(row.collegeId) === String(user.collegeId))
            const mayResend = invitation ? canResendInvitation(invitation) : !invitationError && ['Pending Invitation', 'Expired'].includes(user.accountStatus)
            const actions = {
              view: () => openActivity(user),
              edit: () => setEditing(user),
              access: () => setAccessUser(user),
              resend: () => action(user, 'resend'),
              reset: () => action(user, 'reset'),
              activate: () => action(user, 'activate'),
              deactivate: () => action(user, 'deactivate'),
            }
            return <tr key={user.userId}>
              <td><div className="user-directory__identity"><span className="user-directory__avatar">{user.profileImagePath ? <img src={user.profileImagePath} alt="" /> : initials(user.fullName)}</span><div><strong>{user.fullName}</strong><small>{user.email}</small></div></div></td>
              <td>{user.employeeUserId || user.userId}</td><td>{user.collegeName || user.collegeId || '—'}</td>
              <td>{user.roleName || '—'}</td><td>{user.departmentName || '—'}</td>
              <td><span className={'user-directory__status status-' + String(user.accountStatus).toLowerCase().replaceAll(' ', '-')}><i />{user.accountStatus || '—'}</span></td>
              <td>{date(user.lastLoginAt)}</td>
              <td>{accessView
                ? <button type="button" className="user-directory__button" onClick={() => setAccessUser(user)}>Manage Access</button>
                : <select className="user-directory__row-menu" aria-label={'Actions for ' + user.fullName} value="" onChange={event => actions[event.target.value]?.()}>
                  <option value="">Actions</option><option value="view">View</option>
                  <option value="edit" disabled={!canEdit || busy}>Edit</option><option value="access">Manage Access</option>
                  {mayResend && <option value="resend" disabled={!canEdit || busy || sendingIds.includes(invitation?.invitationId)}>Resend Invitation</option>}
                  {!['Pending Invitation', 'Expired'].includes(user.accountStatus) && <option value="reset" disabled={!canEdit || busy}>Send password setup link</option>}
                  {['Suspended', 'Deactivated'].includes(user.accountStatus)
                    ? <option value="activate" disabled={!canEdit || busy}>Activate</option>
                    : <option value="deactivate" disabled={!canEdit || busy}>Suspend</option>}
                </select>}
              </td>
            </tr>
          })}{!paginatedUsers.length && <tr><td colSpan={8} className="user-directory__empty-cell">No users match these filters.</td></tr>}</tbody>
        </table></div>}
      <footer className="user-directory__pagination"><span>{loading ? 'Loading records…' : directoryError ? 'Record count unavailable' : 'Showing ' + firstVisible + '–' + lastVisible + ' of ' + directoryRows.length + (invitationView ? ' invitations' : ' accounts')}</span><label>Rows per page <select aria-label="Rows per page" value={pageSize} onChange={event => change(setPageSize, Number(event.target.value))}><option value={10}>10</option><option value={25}>25</option><option value={50}>50</option></select></label>{pageCount > 1 && <TablePagination page={currentPage} totalPages={pageCount} onPageChange={setPage} />}</footer>
    </section>
    </>}
    {platformAccess && accessUser && <AccountAccessDialog key={accessUser.userId + ":" + accessUser.collegeId} user={accessUser} canEdit={canEdit} onClose={() => setAccessUser(null)} onSaved={setNotice} />}
    {canEdit && confirmation && <ViewDialog title={['activate', 'deactivate'].includes(confirmation.type) ? 'Confirm account status' : 'Confirm setup email'} onClose={() => setConfirmation(null)} busy={busyUsers.includes(confirmation.user.userId)} showExport={false} hideFooter><p>{actionLabels[confirmation.type]} {confirmation.user.fullName}?</p>{error && <p role="alert">{error}</p>}<div className="user-directory__header-actions"><button type="button" disabled={busyUsers.includes(confirmation.user.userId)} onClick={() => setConfirmation(null)}>Cancel</button><button type="button" disabled={!canEdit || busyUsers.includes(confirmation.user.userId)} onClick={() => action(confirmation.user, confirmation.type, true)}>Confirm</button></div></ViewDialog>}
    {platformAccess && editing && (editing.userId ? <EditUserForm user={editing} onClose={() => setEditing(null)} onSave={saveEdit} saving={saving} /> : <UserForm allowResend={canEdit} onClose={() => { if (!saving && !sendingIds.length) { setEditing(null); setRecovery(null); } }} onSave={save} saving={saving} recovery={recovery} onClearRecovery={() => setRecovery(null)} onView={invitation => { setEditing(null); setViewingInvitation(invitation) }} onResend={resend} sending={Boolean(recovery && sendingIds.includes(recovery.invitationId))} actionError={error} actionNotice={notice} />)}
    {platformAccess && viewingInvitation && <InvitationDetails canEdit={canEdit} invitation={viewingInvitation} onClose={() => setViewingInvitation(null)} onResend={resend} sending={sendingIds.includes(viewingInvitation.invitationId)} actionError={error} actionNotice={notice} />}
    {platformAccess && activity && <ViewDialog title="Account details and history" subtitle={activity.user.fullName} onClose={() => { activityGeneration.current++; setActivity(null) }} showExport={false}>
      {activity.rows === null && <p role="status">Loading account history…</p>}
      {activity.error && <p role="alert">{activity.error} <button type="button" onClick={() => openActivity(activity.user)}>Retry history</button></p>}
      <dl className="user-directory__review">
        {[
          ['Full name', activity.user.fullName], ['Email', activity.user.email], ['Mobile', activity.user.mobile],
          ['Employee / User ID', activity.user.employeeUserId || activity.user.userId],
          ['College', activity.user.collegeName || activity.user.collegeId], ['Department', activity.user.departmentName],
          ['Role', activity.user.roleName], ['Account status', activity.user.accountStatus], ['Last login', date(activity.user.lastLoginAt)],
        ].filter(([, value]) => value).map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}
      </dl>
      {activity.details && <dl className="user-directory__review">
        <div><dt>Explicit module access</dt><dd>{activity.details.permissions.filter(row => String(row.collegeId) === String(activity.user.collegeId) && (row.canView === true || row.canView === 1)).map(row => row.moduleKey).join(', ') || 'None'}</dd></div>
        <div><dt>Invitation status</dt><dd>{activity.details.invitation?.invitationStatus || invitations.find(row => String(row.userId) === String(activity.user.userId) && String(row.collegeId) === String(activity.user.collegeId))?.invitationStatus || activity.details.invitation?.deliveryStatus || 'Not available'}</dd></div>
        <div><dt>Profile setup</dt><dd>{activity.details.user.profileCompleted === true || activity.details.user.profileCompleted === 1 ? 'Complete' : activity.details.user.profileCompleted === false || activity.details.user.profileCompleted === 0 ? 'Pending' : 'Not available'}</dd></div>
        <div><dt>Setup email status</dt><dd>{activity.details.invitation?.deliveryStatus || 'Not available'}</dd></div>
        <div><dt>Provider acceptance</dt><dd>{date(activity.details.invitation?.smtpAcceptedAt)}</dd></div>
        <div><dt>Setup attempts</dt><dd>{activity.details.invitation?.attemptCount ?? 'Not available'}</dd></div>
        <div><dt>Last setup attempt</dt><dd>{date(activity.details.invitation?.lastAttemptAt)}</dd></div>
        <div><dt>Delivery confirmation</dt><dd>Unverified</dd></div>
      </dl>}
      <ul className="user-directory__activity">{(activity.rows || []).map(item => <li key={item.auditId}><strong>{item.action || item.eventType || item.loginStatus}</strong><span>{date(item.createdAt || item.loginAt)} / {item.correlationId || 'Reference unavailable'}</span></li>)}</ul>
      {activity.rows?.length === 0 && !activity.error && <p>No account activity was returned.</p>}
    </ViewDialog>}

  </main>
}
function InvitationTable({ invitations, loading, error, onView, onResend, sendingIds, canEdit, showAll = false }) {
  const pending = showAll ? invitations : invitations.filter(isPendingInvitation);
  if (loading) return <p role="status">Loading invitations…</p>;
  if (error) return <p role="alert" className="user-directory__error">{error}</p>;
  return <div className="user-directory__table-wrap"><p className="user-directory__hint">This list contains college administrator invitations. Other accounts have setup history in Account activity.</p><p className="user-directory__hint">Email status reports provider acceptance, not confirmed inbox delivery. Times are shown in India Standard Time.</p><table><thead><tr>{['Administrator / Email', 'College', 'Role', 'Invitation status', 'Created', 'Last email attempt', 'Expires', 'Email status', 'Actions'].map(label => <th key={label}>{label}</th>)}</tr></thead><tbody>{pending.map(row => <tr key={row.invitationId}><td data-label="User">{row.fullName}<small className="user-directory__subline">{row.email}</small></td><td data-label="College">{row.collegeName}<small className="user-directory__subline">{row.collegeCode}</small></td><td data-label="Role">{row.roleName}</td><td data-label="Invitation status">{row.invitationStatus}</td><td data-label="Created">{date(row.createdAt)}</td><td data-label="Last email attempt">{date(row.lastEmailAttempt)}</td><td data-label="Expires">{date(row.expiresAt)}</td><td data-label="Email status">{row.emailStatus || 'Unknown'}</td><td data-label="Actions"><div className="user-directory__invitation-actions"><button className="user-directory__button" onClick={() => onView(row)}>View Invitation</button><button className="user-directory__button" disabled={!canEdit || !canResendInvitation(row) || sendingIds.includes(row.invitationId)} onClick={() => onResend(row)}>{sendingIds.includes(row.invitationId) ? 'Sending…' : 'Resend Invitation'}</button></div></td></tr>)}</tbody></table>{!pending.length && <p className="user-directory__empty">No invitation records match these filters.</p>}</div>;
}
function InvitationDetails({ invitation: row, onClose, onResend, sending, actionError, actionNotice, canEdit }) {
  return <ViewDialog title="Invitation details" onClose={onClose} busy={sending} showExport={false} hideFooter><section className="user-directory__dialog-content">{actionError && <p className="user-directory__error" role="alert">{actionError}</p>}{actionNotice && <p role="status">{actionNotice}</p>}<dl className="user-directory__review">{[['Administrator', row.fullName], ['Email', row.email], ['College', row.collegeName], ['College code', row.collegeCode], ['Role', row.roleName], ['Status', row.invitationStatus], ['Created', date(row.createdAt)], ['Last email attempt', date(row.lastEmailAttempt)], ['Expires', date(row.expiresAt)], ['Email status', row.emailStatus || 'Unknown']].map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value || 'Not available'}</dd></div>)}</dl><footer><button className="user-directory__button" onClick={onClose}>Close</button>{canResendInvitation(row) && <button className="user-directory__button user-directory__button--primary" disabled={!canEdit || sending} onClick={() => onResend(row)}>{sending ? 'Sending…' : 'Resend Invitation'}</button>}</footer></section></ViewDialog>;
}
export default function UserAccessManagement({ initialOnboarding = false }) { return <DashboardLayout><UserDirectory initialOnboarding={initialOnboarding} /></DashboardLayout> }
