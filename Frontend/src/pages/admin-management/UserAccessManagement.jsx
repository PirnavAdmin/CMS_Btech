import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { FiActivity, FiAlertCircle, FiCheckCircle, FiDownload, FiEdit2, FiMail, FiPlus, FiRefreshCw, FiSearch, FiShield, FiUsers, FiX } from 'react-icons/fi'
import DashboardLayout from '../../layouts/DashboardLayout.jsx'
import { AcademicProvider } from '../../context/AcademicContext.jsx'
import { roleApi, userDirectoryApi } from '../../api/apiEndpoints.js'
import './UserAccessManagement.css'
import { canResendInvitation, resolveOnboardingConflict } from './invitationRecovery.js'

const blankForm = { fullName: '', email: '', mobile: '', collegeName: '', collegeCode: '', collegeType: 'Engineering', universityName: '', collegeEmail: '', collegeMobile: '', addressLine1: '', city: '', state: '', pincode: '' }
const statuses = ['Active', 'Pending Invitation', 'Profile Pending', 'Expired', 'Suspended', 'Deactivated']
const initials = name => String(name || '?').split(/\s+/).filter(Boolean).slice(0, 2).map(part => part[0]).join('').toUpperCase()
const date = value => {
  if (!value) return 'Not available'
  const raw = String(value), timestamp = /(Z|[+-]\d{2}:?\d{2})$/i.test(raw) ? raw : raw + 'Z'
  return Number.isNaN(Date.parse(timestamp)) ? 'Not available' : new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Kolkata' }).format(new Date(timestamp))
}

export function UserForm({ onClose, onSave, saving, recovery, onClearRecovery, onView, onResend, sending, actionError, actionNotice }) {
  const [step, setStep] = useState(0)
  const [form, setForm] = useState(() => ({ ...blankForm }))
  const [error, setError] = useState('')
  const [deliveryFailure, setDeliveryFailure] = useState(null)
  const patch = values => { onClearRecovery?.(); setForm(current => ({ ...current, ...values })) }
  const submit = async event => { event.preventDefault(); setError(''); if (step < 2) { setStep(step + 1); return }; try { await onSave({ ...form, fullName: form.fullName.trim(), email: form.email.trim(), mobile: form.mobile.trim(), collegeName: form.collegeName.trim(), collegeCode: form.collegeCode.trim().toUpperCase(), collegeEmail: form.collegeEmail.trim(), collegeMobile: form.collegeMobile.trim(), addressLine1: form.addressLine1.trim(), city: form.city.trim(), state: form.state.trim(), pincode: form.pincode.trim() }) } catch (reason) { setDeliveryFailure(reason.invitationFailure || null); setError(reason.status === 404 ? 'The running backend does not have the new college onboarding route yet. Restart the backend with the latest code, then retry.' : reason.message || 'Could not onboard client.') } }
  const stepNames = ['Administrator', 'New college', 'Review & invite']
  return <div className="user-directory__backdrop" onMouseDown={event => event.target === event.currentTarget && onClose()}><section className="user-directory__dialog user-directory__form-dialog" role="dialog" aria-modal="true" aria-labelledby="user-form-title"><header><div><span className="user-directory__eyebrow">New client onboarding</span><h2 id="user-form-title">Invite college administrator</h2></div><button className="user-directory__icon-button" type="button" onClick={onClose} aria-label="Close"><FiX /></button></header><form onSubmit={submit}>
    <nav className="user-directory__wizard-steps" aria-label="Invitation progress">{stepNames.map((name, index) => <button type="button" key={name} className={step === index ? 'is-active' : step > index ? 'is-complete' : ''} onClick={() => index <= step && setStep(index)}><b>{index + 1}</b>{name}</button>)}</nav>
    {step === 0 && <fieldset><legend>Personal Information</legend><div className="user-directory__form-grid"><label>Full Name<input required maxLength="150" value={form.fullName} onChange={event => patch({ fullName: event.target.value })} /></label><label>Official Email Address<input required type="email" maxLength="150" value={form.email} onChange={event => patch({ email: event.target.value })} /></label><label>Mobile Number<input required inputMode="tel" maxLength="15" value={form.mobile} onChange={event => patch({ mobile: event.target.value })} /></label></div></fieldset>}
    {step === 1 && <fieldset><legend>New College Details</legend><div className="user-directory__form-grid"><label>College Name<input required maxLength="200" value={form.collegeName} onChange={event => patch({ collegeName: event.target.value })} /></label><label>College Code<input required maxLength="12" pattern="[A-Za-z0-9]{2,12}" title="Use 2 to 12 letters or numbers." value={form.collegeCode} onChange={event => patch({ collegeCode: event.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '') })} /></label><label>College Type<select required value={form.collegeType} onChange={event => patch({ collegeType: event.target.value })}><option>Engineering</option><option>Degree</option><option>Management</option><option>Medical</option><option>Other</option></select></label><label>University Name<input required maxLength="200" value={form.universityName} onChange={event => patch({ universityName: event.target.value })} /></label><label>College Email<input type="email" maxLength="150" value={form.collegeEmail} onChange={event => patch({ collegeEmail: event.target.value })} /></label><label>College Contact Number<input maxLength="20" value={form.collegeMobile} onChange={event => patch({ collegeMobile: event.target.value })} /></label><label>Address<input required maxLength="255" value={form.addressLine1} onChange={event => patch({ addressLine1: event.target.value })} /></label><label>City<input required maxLength="100" value={form.city} onChange={event => patch({ city: event.target.value })} /></label><label>State<input required maxLength="100" value={form.state} onChange={event => patch({ state: event.target.value })} /></label><label>Pincode<input required maxLength="10" inputMode="numeric" value={form.pincode} onChange={event => patch({ pincode: event.target.value })} /></label></div></fieldset>}    {step === 2 && <fieldset><legend>Review & Send Invitation</legend><dl className="user-directory__review"><dt>Administrator</dt><dd>{form.fullName || '—'}</dd><dt>Sign-in email</dt><dd>{form.email || '—'}</dd><dt>New college</dt><dd>{form.collegeName || '—'} ({form.collegeCode || '—'})</dd><dt>University</dt><dd>{form.universityName || '—'}</dd><dt>Initial role</dt><dd>College Administrator</dd></dl><p className="user-directory__hint"><FiMail /> The college and its administrator account will be created together. A secure password setup invitation will be sent to the administrator’s email.</p></fieldset>}    {error && <p className="user-directory__error" role="alert">{error}</p>}{step === 2 && recovery && <div className="user-directory__recovery">{actionError && <p role="alert">{actionError}</p>}{actionNotice && <p role="status">{actionNotice}</p>}<p>An onboarding record already exists for this administrator or college. Review the existing invitation before continuing.</p><button type="button" className="user-directory__button" onClick={() => onView(recovery)}>View Existing Invitation</button><button type="button" className="user-directory__button user-directory__button--primary" disabled={sending} onClick={() => onResend(recovery)}>{sending ? 'Sending…' : 'Resend Invitation'}</button></div>}<footer><button type="button" disabled={saving || sending} className="user-directory__button" onClick={step ? () => setStep(step - 1) : onClose}>{step ? 'Back' : 'Cancel'}</button>{step < 2 ? <button type="submit" className="user-directory__button user-directory__button--primary" disabled={saving}>Next</button> : <button className="user-directory__button user-directory__button--primary" disabled={saving || sending || Boolean(recovery) || Boolean(deliveryFailure)}>{saving ? 'Sending...' : 'Send Invitation'}</button>}</footer>
  </form></section></div>
}

function EditUserForm({ user, onClose, onSave, saving }) {
  const [form, setForm] = useState({ fullName: user.fullName || '', email: user.email || '', mobile: user.mobile || '', designation: user.designation || '' })
  const [error, setError] = useState('')
  const patch = event => setForm(current => ({ ...current, [event.target.name]: event.target.value }))
  const submit = async event => {
    event.preventDefault()
    setError('')
    try {
      let roleIds = (user.roleIds?.length ? user.roleIds : [user.roleId])
        .map(value => Number(value))
        .filter(value => Number.isInteger(value) && value > 0)

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
        designation: form.designation.trim(), academicYearIds: user.academicYearIds || [], permissions: user.permissions || {},
      })
    } catch (reason) { setError(reason.message || 'Could not update this account.') }
  }
  return <div className="user-directory__backdrop" onMouseDown={event => event.target === event.currentTarget && onClose()}><section className="user-directory__dialog user-directory__form-dialog" role="dialog" aria-modal="true" aria-labelledby="edit-user-title"><header><div><span className="user-directory__eyebrow">Update account details</span><h2 id="edit-user-title">Edit {user.fullName}</h2></div><button className="user-directory__icon-button" type="button" onClick={onClose} aria-label="Close"><FiX /></button></header><form onSubmit={submit}><fieldset><legend>Account details</legend><div className="user-directory__form-grid"><label>Full Name<input name="fullName" required maxLength="150" value={form.fullName} onChange={patch} /></label><label>Sign-in Email<input name="email" type="email" required maxLength="150" value={form.email} onChange={patch} /></label><label>Mobile Number<input name="mobile" required maxLength="15" value={form.mobile} onChange={patch} /></label><label>Designation<input name="designation" required maxLength="150" value={form.designation} onChange={patch} /></label></div></fieldset>{error && <p className="user-directory__error" role="alert">{error}</p>}<footer><button type="button" className="user-directory__button" onClick={onClose}>Cancel</button><button className="user-directory__button user-directory__button--primary" disabled={saving}>{saving ? 'Saving...' : 'Save and send setup link'}</button></footer></form></section></div>
}

export function UserDirectory() {
  const [users, setUsers] = useState([]), [loading, setLoading] = useState(true), [saving, setSaving] = useState(false), [error, setError] = useState(''), [notice, setNotice] = useState('')
  const [search, setSearch] = useState(''), [tab, setTab] = useState('All Users'), [college, setCollege] = useState(''), [department, setDepartment] = useState(''), [role, setRole] = useState(''), [status, setStatus] = useState(''), [editing, setEditing] = useState(null), [activity, setActivity] = useState(null)
  const [invitations, setInvitations] = useState([]), [invitationError, setInvitationError] = useState(''), [recovery, setRecovery] = useState(null), [viewingInvitation, setViewingInvitation] = useState(null), [sendingIds, setSendingIds] = useState([])
  const sendingRef = useRef(new Set())
  const onboardingRef = useRef(false)
  const load = useCallback(async () => {
    setLoading(true); setError(''); setInvitationError('');
    const [accounts, invitationsResult] = await Promise.allSettled([userDirectoryApi.getAll(), userDirectoryApi.invitations()]);
    if (accounts.status === 'fulfilled') setUsers(accounts.value); else setError(accounts.reason.message || 'Users could not be loaded.');
    if (invitationsResult.status === 'fulfilled') setInvitations(invitationsResult.value); else { setInvitations([]); setInvitationError(invitationsResult.reason.message || 'Invitation records could not be loaded.'); }
    setLoading(false);
  }, [])
  useEffect(() => { load() }, [load])
  const visible = useMemo(() => users.filter(user => (!search || [user.fullName,user.email,user.mobile,user.employeeUserId].some(value => String(value || '').toLowerCase().includes(search.toLowerCase()))) && (!college || String(user.collegeId) === college) && (!department || String(user.departmentId) === department) && (!role || String(user.roleId) === role) && (!status || user.accountStatus === status) && (tab === 'All Users' || (tab === 'Pending Invitations' ? ['Pending Invitation', 'Expired'].includes(user.accountStatus) : user.accountStatus === tab))), [users, search, college, department, role, status, tab])
  const counts = Object.fromEntries(statuses.map(item => [item, users.filter(user => user.accountStatus === item).length]))
  const save = async payload => {
    if (onboardingRef.current) return;
    onboardingRef.current = true;
    setSaving(true); setRecovery(null); setError(''); setNotice('');
    try {
      const college = { collegeName: payload.collegeName, collegeCode: payload.collegeCode, collegeType: payload.collegeType, universityName: payload.universityName, email: payload.collegeEmail || null, mobile: payload.collegeMobile || null, addressLine1: payload.addressLine1, city: payload.city, state: payload.state, pincode: payload.pincode, country: 'India' };
      const result = await userDirectoryApi.onboardCollege({ ...college, ...Object.fromEntries(Object.entries(college).map(([key, value]) => [key[0].toUpperCase() + key.slice(1), value])), college, adminName: payload.fullName, adminFullName: payload.fullName, adminEmail: payload.email, adminMobile: payload.mobile });
      setNotice(result.message || 'Onboarding saved. Review the invitation email status below.'); setEditing(null); await load();
    } catch (reason) {
      // A conflict, provider error or lost response may follow a committed transaction.
      // Fetch authoritative associations; never resend/reset on an email-only match.
      try {
        const records = await userDirectoryApi.invitations(); setInvitations(records);
        const result = resolveOnboardingConflict(records, payload, reason.invitationFailure);
        if (result.match) { setRecovery(result.match); setTab('Pending Invitations'); throw Object.assign(new Error(reason.invitationFailure ? reason.message : 'An onboarding record already exists for this administrator or college. Review the existing invitation before continuing.'), { recovered: true, invitationFailure: reason.invitationFailure }); }
        if (result.conflict) throw Object.assign(new Error(result.conflict), { recovered: true, invitationFailure: reason.invitationFailure });
      } catch (lookupError) {
        if (lookupError.recovered) throw lookupError;
        setInvitationError('Existing invitations could not be verified. Refresh Pending Invitations before trying onboarding again.');
      }
      throw reason;
    } finally { onboardingRef.current = false; setSaving(false); }
  }
  const saveEdit = async payload => { if (!editing?.userId) return; setSaving(true); setError(''); try { await userDirectoryApi.update(editing.userId, payload); try { await userDirectoryApi.resetPassword(editing.userId) } catch (reason) { throw new Error(`Account details were saved, but the setup email could not be sent to ${payload.email}: ${reason.message}`) } setNotice(`Account details saved and password setup link sent to ${payload.email}.`); setEditing(null); await load() } catch (reason) { setError(reason.message || 'Could not update this account.'); throw reason } finally { setSaving(false) } }
  const resend = async invitation => {
    const id = invitation.invitationId;
    if (!canResendInvitation(invitation) || sendingRef.current.has(id)) return;
    sendingRef.current.add(id); setSendingIds([...sendingRef.current]); setError(''); setNotice('');
    try {
      const result = await userDirectoryApi.resendInvitation(id);
      setNotice(result.message || 'Resend request completed. Review the updated email status; inbox delivery is not confirmed.');
    } catch (reason) { setError(reason.message || 'Invitation email could not be confirmed.'); }
    finally {
      try {
        const records = await userDirectoryApi.invitations(); setInvitations(records);
        setRecovery(current => current ? records.find(row => String(row.invitationId) === String(current.invitationId) && canResendInvitation(row)) || null : null);
        setViewingInvitation(current => current ? records.find(row => String(row.invitationId) === String(current.invitationId)) || current : null);
      } catch (reason) { setInvitationError(reason.message || 'Could not refresh invitation status.'); }
      sendingRef.current.delete(id); setSendingIds([...sendingRef.current]);
    }
  };
  const action = async (user, type) => {
    if (type === 'resend') {
      const invitation = invitations.find(row => String(row.userId) === String(user.userId) && String(row.collegeId) === String(user.collegeId));
      if (!invitation) { setError('No verified invitation is available. Refresh Pending Invitations before resending.'); return; }
      await resend(invitation); return;
    }
    const labels = { suspend: 'suspend', activate: 'activate', deactivate: 'deactivate', reset: 'send a password setup link to' };
    if (['suspend','deactivate'].includes(type) && !window.confirm('Are you sure you want to ' + labels[type] + ' ' + user.fullName + '?')) return;
    setError(''); try { const result = type === 'reset' ? await userDirectoryApi.resetPassword(user.userId) : await userDirectoryApi.setStatus(user.userId, type); setNotice(result?.message || 'Account action completed.'); await load() } catch (reason) { setError(reason.message || 'Account action failed.') }
  }
  const exportCsv = async () => { try { const result = await userDirectoryApi.exportCsv({ Search: search }); const url = URL.createObjectURL(result.blob), link = document.createElement('a'); link.href = url; link.download = 'users.csv'; link.click(); URL.revokeObjectURL(url) } catch (reason) { setError(reason.message) } }
  return <main className="user-directory"><header className="user-directory__header"><div><span className="user-directory__eyebrow">Administration / Access</span><h1>User Access Management</h1><p>Invite users, assign college access, and manage account security.</p></div><div className="user-directory__header-actions"><button className="user-directory__button" onClick={exportCsv}><FiDownload /> Export</button><button className="user-directory__button user-directory__button--primary" onClick={() => setEditing({})}><FiPlus /> Invite User</button></div></header>
    {notice && <div className="user-directory__notice" role="status">{notice}<button onClick={() => setNotice('')} aria-label="Dismiss"><FiX /></button></div>}{error && <div className="user-directory__error" role="alert">{error}<button className="user-directory__button" onClick={load}>Retry</button></div>}
    <section className="user-directory__stats"><article><span className="user-directory__stat-icon"><FiUsers /></span><div><small>Total Accounts</small><strong>{loading ? '--' : users.length}</strong></div></article><article><span className="user-directory__stat-icon user-directory__stat-icon--green"><FiCheckCircle /></span><div><small>Active Accounts</small><strong>{counts.Active || 0}</strong></div></article><article><span className="user-directory__stat-icon"><FiMail /></span><div><small>Pending Invitations</small><strong>{loading ? '--' : invitationError ? '--' : invitations.filter(canResendInvitation).length}</strong></div></article><article><span className="user-directory__stat-icon user-directory__stat-icon--gray"><FiAlertCircle /></span><div><small>Suspended Accounts</small><strong>{counts.Suspended || 0}</strong></div></article></section>
    <section className="user-directory__panel"><div className="user-directory__panel-heading"><div><h2>{tab === 'Pending Invitations' ? 'Pending Invitations' : 'Accounts'}</h2><p>Access status, college assignments, and last login activity.</p></div><button className="user-directory__icon-button" onClick={load} aria-label="Refresh"><FiRefreshCw /></button></div><nav className="user-directory__tabs">{['All Users','Active','Pending Invitations','Suspended'].map(item => <button className={tab === item ? 'is-active' : ''} key={item} onClick={() => setTab(item)}>{item}</button>)}</nav>
      <div className="user-directory__filters"><label className="user-directory__search"><FiSearch /><input placeholder="Search name, email, or employee ID" value={search} onChange={event => setSearch(event.target.value)} /></label><select value={status} onChange={event => setStatus(event.target.value)}><option value="">Any status</option>{statuses.map(item => <option key={item}>{item}</option>)}</select></div>
      {tab === 'Pending Invitations' ? <InvitationTable invitations={invitations} loading={loading} error={invitationError} onView={setViewingInvitation} onResend={resend} sendingIds={sendingIds} /> : loading ? <div className="user-directory__loading">Loading accounts...</div> : visible.length ? <div className="user-directory__table-wrap"><table><thead><tr><th>User</th><th>College / Department</th><th>Role</th><th>Status</th><th>Last Login</th><th>Actions</th></tr></thead><tbody>{visible.map(user => <tr key={user.userId}><td><div className="user-directory__identity"><span className="user-directory__avatar">{user.profileImagePath ? <img src={user.profileImagePath} alt="" /> : initials(user.fullName)}</span><div><strong>{user.fullName}</strong><small>{user.email}{user.employeeUserId ? `  /  ${user.employeeUserId}` : ''}</small></div></div></td><td>{user.collegeName || '--'}<small className="user-directory__subline">{user.departmentName || '--'}</small></td><td>{user.roleName || '--'}</td><td><span className={`user-directory__status status-${String(user.accountStatus).toLowerCase().replaceAll(' ', '-')}`}><i />{user.accountStatus}</span></td><td>{date(user.lastLoginAt)}</td><td><div className="user-directory__actions"><button title="Edit account details" aria-label={`Edit ${user.fullName}`} onClick={() => setEditing(user)}><FiEdit2 /></button>{['Pending Invitation','Expired'].includes(user.accountStatus) ? <button title="Resend invitation" aria-label={`Resend invitation to ${user.fullName}`} onClick={() => action(user,'resend')}><FiMail /></button> : <button title="Send password setup link" aria-label={`Send password setup link to ${user.fullName}`} onClick={() => action(user,'reset')}><FiShield /></button>}<button title="Account activity" aria-label={`View activity for ${user.fullName}`} onClick={async () => { try { setActivity(await userDirectoryApi.activity(user.userId)) } catch (reason) { setError(reason.message) } }}><FiActivity /></button><select aria-label={`Change ${user.fullName} status`} value="" onChange={event => event.target.value && action(user,event.target.value)}><option value="">Status...</option>{user.accountStatus === 'Active' ? <><option value="suspend">Suspend</option><option value="deactivate">Deactivate</option></> : user.accountStatus === 'Suspended' || user.accountStatus === 'Deactivated' ? <><option value="activate">Activate</option><option value="deactivate">Deactivate</option></> : <option value="deactivate">Deactivate</option>}</select></div></td></tr>)}</tbody></table></div> : <div className="user-directory__empty"><FiUsers /><h3>No users found</h3><p>Change your filters or invite a user.</p></div>}
      <footer className="user-directory__pagination"><span>Showing {visible.length} of {users.length} accounts</span><span>{loading ? 'Refreshing...' : 'Live account data'}</span></footer>
    </section>
    {editing && (editing.userId ? <EditUserForm user={editing} onClose={() => setEditing(null)} onSave={saveEdit} saving={saving} /> : <UserForm onClose={() => { if (!saving && !sendingIds.length) { setEditing(null); setRecovery(null); } }} onSave={save} saving={saving} recovery={recovery} onClearRecovery={() => setRecovery(null)} onView={setViewingInvitation} onResend={resend} sending={Boolean(recovery && sendingIds.includes(recovery.invitationId))} actionError={error} actionNotice={notice} />)}
    {viewingInvitation && <InvitationDetails invitation={viewingInvitation} onClose={() => setViewingInvitation(null)} onResend={resend} sending={sendingIds.includes(viewingInvitation.invitationId)} actionError={error} actionNotice={notice} />}
    {activity && <div className="user-directory__backdrop" onMouseDown={event => event.target === event.currentTarget && setActivity(null)}><section className="user-directory__dialog"><header><h2>Recent account activity</h2><button className="user-directory__icon-button" onClick={() => setActivity(null)}><FiX /></button></header><ul className="user-directory__activity">{activity.map((item,index) => <li key={index}><strong>{item.eventType || item.loginStatus}</strong><span>{date(item.loginAt)}  /  {item.ipAddress || 'IP unavailable'}</span></li>)}</ul></section></div>}
  </main>
}
function InvitationTable({ invitations, loading, error, onView, onResend, sendingIds }) {
  const pending = invitations.filter(canResendInvitation);
  if (loading) return <p role="status">Loading invitations…</p>;
  if (error) return <p role="alert" className="user-directory__error">{error}</p>;
  return <div className="user-directory__table-wrap"><p className="user-directory__hint">Email status reports provider acceptance, not confirmed inbox delivery. Times are shown in India Standard Time.</p><table><thead><tr>{['Administrator / Email', 'College', 'Role', 'Invitation status', 'Created', 'Last email attempt', 'Expires', 'Email status', 'Actions'].map(label => <th key={label}>{label}</th>)}</tr></thead><tbody>{pending.map(row => <tr key={row.invitationId}><td>{row.fullName}<small className="user-directory__subline">{row.email}</small></td><td>{row.collegeName}<small className="user-directory__subline">{row.collegeCode}</small></td><td>{row.roleName}</td><td>{row.invitationStatus}</td><td>{date(row.createdAt)}</td><td>{date(row.lastEmailAttempt)}</td><td>{date(row.expiresAt)}</td><td>{row.emailStatus || 'Unknown'}</td><td><div className="user-directory__invitation-actions"><button className="user-directory__button" onClick={() => onView(row)}>View Invitation</button><button className="user-directory__button" disabled={sendingIds.includes(row.invitationId)} onClick={() => onResend(row)}>{sendingIds.includes(row.invitationId) ? 'Sending…' : 'Resend Invitation'}</button></div></td></tr>)}</tbody></table>{!pending.length && <p className="user-directory__empty">No pending invitations.</p>}</div>;
}
function InvitationDetails({ invitation: row, onClose, onResend, sending, actionError, actionNotice }) {
  return <div className="user-directory__backdrop user-directory__invitation-backdrop"><section className="user-directory__dialog" role="dialog" aria-modal="true" aria-label="Invitation details"><header><h2>Invitation details</h2><button className="user-directory__icon-button" onClick={onClose} aria-label="Close invitation"><FiX /></button></header>{actionError && <p className="user-directory__error" role="alert">{actionError}</p>}{actionNotice && <p role="status">{actionNotice}</p>}<dl className="user-directory__review">{[['Administrator', row.fullName], ['Email', row.email], ['College', row.collegeName], ['College code', row.collegeCode], ['Role', row.roleName], ['Status', row.invitationStatus], ['Created', date(row.createdAt)], ['Last email attempt', date(row.lastEmailAttempt)], ['Expires', date(row.expiresAt)], ['Email status', row.emailStatus || 'Unknown']].map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value || 'Not available'}</dd></div>)}</dl><footer><button className="user-directory__button" onClick={onClose}>Back</button>{canResendInvitation(row) && <button className="user-directory__button user-directory__button--primary" disabled={sending} onClick={() => onResend(row)}>{sending ? 'Sending…' : 'Resend Invitation'}</button>}</footer></section></div>;
}
export default function UserAccessManagement() { return <AcademicProvider><DashboardLayout><UserDirectory /></DashboardLayout></AcademicProvider> }
