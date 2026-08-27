import { useEffect, useRef, useState } from 'react'
import { FiEdit2, FiMail, FiMapPin, FiPhone, FiShield, FiUser, FiX } from 'react-icons/fi'
import DashboardLayout from '../../layouts/DashboardLayout'
import { lookupIndianPincode, profileApi } from '../../api/apiEndpoints'
import { getDepartments } from '../../auth/collegeApi'
import './MyProfile.css'

const emptyForm = { fullName: '', email: '', mobile: '', dateOfBirth: '', gender: '', departmentId: '', designation: '', address: '', pincode: '', city: '', district: '', state: '', bio: '' }
const emptyErrors = {}
const display = (value) => value === null || value === undefined || String(value).trim() === '' ? '—' : value
const formatLastLogin = (value) => {
  if (!value) return '—'
  const raw = String(value).trim()
  const date = new Date(/(Z|[+-]\d{2}:?\d{2})$/i.test(raw) ? raw : `${raw}Z`)
  return Number.isNaN(date.getTime()) ? '—' : new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Kolkata' }).format(date)
}
const formatDateOnly = (value) => {
  if (!value) return '—'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? display(value).split('T')[0] : new Intl.DateTimeFormat('en-IN', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'Asia/Kolkata' }).format(date)
}
const initials = (name) => String(name || '').split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toUpperCase() || 'U'
const validate = (form) => {
  const errors = {}
  const name = form.fullName.trim()
  const email = form.email.trim()
  if (!name) errors.fullName = 'Full name is required.'
  else if (!/^[A-Za-z][A-Za-z .'-]{2,79}$/.test(name)) errors.fullName = 'Enter a valid full name.'
  if (!email) errors.email = 'Email address is required.'
  else if (!/^\S+@\S+\.\S+$/.test(email)) errors.email = 'Enter a valid email address.'
  if (!/^[6-9]\d{9}$/.test(form.mobile)) errors.mobile = 'Enter a valid 10-digit Indian mobile number.'
  if (form.dateOfBirth && new Date(form.dateOfBirth) >= new Date()) errors.dateOfBirth = 'Date of birth must be in the past.'
  if (form.pincode && !/^\d{6}$/.test(form.pincode)) errors.pincode = 'Enter a valid 6-digit PIN code.'
  return errors
}

function DetailSection({ icon: Icon, title, children, className = '' }) { return <div className={`profile-preview-group ${className}`}><header><span><Icon /></span><div><h2>{title}</h2><p>Saved information from your account</p></div></header><div className="profile-detail-grid">{children}</div></div> }
function Detail({ label, value, wide = false }) { return <div className={wide ? 'profile-detail wide' : 'profile-detail'}><span>{label}</span><strong>{display(value)}</strong></div> }

export default function MyProfile() {
  const [profile, setProfile] = useState(null)
  const [departments, setDepartments] = useState([])
  const [loading, setLoading] = useState(true)
  const [feedback, setFeedback] = useState(null)
  const [editOpen, setEditOpen] = useState(false)
  const [editForm, setEditForm] = useState(emptyForm)
  const [errors, setErrors] = useState(emptyErrors)
  const [saving, setSaving] = useState(false)
  const [pincodeStatus, setPincodeStatus] = useState('')
  const closeButtonRef = useRef(null)

  const loadProfile = async () => {
    setLoading(true); setFeedback(null)
    try { setProfile(await profileApi.getProfile()) }
    catch (error) { setProfile(null); setFeedback({ type: 'error', message: error.message || 'Unable to load profile information.' }) }
    finally { setLoading(false) }
  }
  useEffect(() => { loadProfile() }, [])
  useEffect(() => { getDepartments().then((response) => { const data = response?.data?.data ?? response?.data; setDepartments(Array.isArray(data) ? data : []) }).catch(() => setDepartments([])) }, [])
  useEffect(() => {
    if (feedback?.type !== 'success') return undefined
    const timer = setTimeout(() => setFeedback(null), 2000)
    return () => clearTimeout(timer)
  }, [feedback])

  const openEdit = () => { setEditForm({ fullName: profile.fullName || '', email: profile.email || '', mobile: profile.mobile || '', dateOfBirth: profile.dateOfBirth ? String(profile.dateOfBirth).slice(0, 10) : '', gender: profile.gender || '', department: profile.department || '', departmentId: profile.departmentId || '', designation: profile.designation || '', address: profile.address || '', pincode: profile.pincode || profile.postalCode || '', city: profile.city || '', district: profile.district || '', state: profile.state || '', bio: profile.bio || '' }); setErrors({}); setPincodeStatus(''); setFeedback(null); setEditOpen(true) }
  const closeEdit = () => { if (!saving) { setEditOpen(false); setErrors({}); setPincodeStatus(''); setEditForm(emptyForm) } }
  useEffect(() => {
    if (!editOpen) return undefined
    closeButtonRef.current?.focus()
    const onKeyDown = (event) => { if (event.key === 'Escape') closeEdit() }
    document.body.style.overflow = 'hidden'
    document.querySelectorAll('.profile-edit-dialog input[name="fullName"], .profile-edit-dialog input[name="designation"]').forEach((input) => { input.readOnly = true; input.setAttribute('aria-readonly', 'true') })
    window.addEventListener('keydown', onKeyDown)
    return () => { document.body.style.overflow = ''; window.removeEventListener('keydown', onKeyDown) }
  }, [editOpen, saving])
  const update = async (event) => { const name = event.target.name; const value = ['mobile', 'pincode'].includes(name) ? event.target.value.replace(/\D/g, '').slice(0, name === 'pincode' ? 6 : 10) : event.target.value; const next = { ...editForm, [name]: value }; setEditForm(next); setErrors(validate(next)); setFeedback(null); if (name === 'pincode') { setPincodeStatus(''); if (/^\d{6}$/.test(value)) { setPincodeStatus('Finding location...'); try { const location = await lookupIndianPincode(value); setEditForm((current) => ({ ...current, ...location })); setPincodeStatus('City, district and state filled automatically.') } catch (error) { setPincodeStatus(error.message || 'PIN lookup failed. Enter the location manually.') } } } }
  const save = async (event) => {
    event.preventDefault(); const nextErrors = validate(editForm); setErrors(nextErrors); if (Object.keys(nextErrors).length || saving) return
    setSaving(true); setFeedback(null)
    const departmentMatch = departments.find((item) => String(item.departmentName ?? item.name ?? '').trim().toLowerCase() === editForm.department.trim().toLowerCase() || String(item.departmentCode ?? item.code ?? '').trim().toLowerCase() === editForm.department.trim().toLowerCase())
    try { await profileApi.updateProfile({ ...editForm, departmentId: editForm.departmentId || departmentMatch?.departmentId || departmentMatch?.id || null }); await loadProfile(); setEditOpen(false); setFeedback({ type: 'success', message: 'Profile updated successfully.' }); window.setTimeout(() => setFeedback(null), 2000) }
    catch (error) { setFeedback({ type: 'error', message: error.message || 'Unable to update profile. Please try again.' }) }
    finally { setSaving(false) }
  }

  if (loading) return <DashboardLayout><main className="profile-page"><div className="profile-state"><span className="profile-spinner" /><h2>Loading your profile</h2><p>Please wait while we retrieve your information.</p></div></main></DashboardLayout>
  if (!profile) return <DashboardLayout><main className="profile-page"><div className="profile-state error"><section className="profile-error-card" role="alert"><h2>Profile unavailable</h2><p>{feedback?.message || 'Unable to load profile information.'}</p><button type="button" className="profile-button" onClick={loadProfile}>Try Again</button></section></div></main></DashboardLayout>

  return <DashboardLayout><main className="profile-page">
    <header className="profile-heading"><div><p className="profile-eyebrow">Account</p><h1>My Profile</h1><p>Review your saved identity and account information.</p></div><button type="button" className="profile-button" onClick={openEdit}><FiEdit2 /> Edit Profile</button></header>
    {feedback && <div className={`profile-feedback ${feedback.type}`} role={feedback.type === 'error' ? 'alert' : 'status'}>{feedback.message}</div>}
    <section className="profile-overview"><div className="profile-identity"><div className="profile-avatar" aria-hidden="true">{initials(profile.fullName)}</div><div><h2 className="profile-name">{display(profile.fullName)}</h2><p>{display(profile.email)}</p><span className="profile-role"><FiShield /> {display(profile.role)}</span></div></div><dl className="profile-facts"><div><dt>Employee ID</dt><dd>{display(profile.identifier)}</dd></div><div><dt>Last Login</dt><dd>{formatLastLogin(profile.lastLoginAt)}</dd></div><div><dt>Account Status</dt><dd className="profile-status"><i /> Active</dd></div></dl></section>
    <section className="profile-preview-section profile-details-card">
      <DetailSection icon={FiUser} title="Personal Information">
        <Detail label="Full Name" value={profile.fullName} />
        <Detail label="Email Address" value={profile.email} />
        <Detail label="Mobile Number" value={profile.mobile} />
        <Detail label="Gender" value={profile.gender} />
        <Detail label="Date of Birth" value={formatDateOnly(profile.dateOfBirth)} />
      </DetailSection>
      <DetailSection icon={FiShield} title="Institutional Details">
        <Detail label="Employee ID" value={profile.identifier} />
        <Detail label="Assigned Role" value={profile.role} />
        <Detail label="Department" value={profile.department} />
        <Detail label="Designation / Programme" value={profile.designation} />
      </DetailSection>
      <DetailSection icon={FiMapPin} title="Address & Bio">
        <Detail label="Address" value={profile.address} wide />
        <Detail label="City / Block" value={profile.city} />
        <Detail label="District" value={profile.district} />
        <Detail label="State" value={profile.state} />
            <Detail label="PIN Code" value={profile.pincode || profile.postalCode} />
        <Detail label="About Me" value={profile.bio} wide />
      </DetailSection>
    </section>
    {editOpen && <div className="profile-modal" onMouseDown={(event) => event.target === event.currentTarget && closeEdit()}><section className="profile-edit-dialog" role="dialog" aria-modal="true" aria-labelledby="profile-edit-title"><header><div><p className="profile-eyebrow">Account</p><h2 id="profile-edit-title">Edit Profile</h2><span>Update your personal, institutional, contact, and address information.</span></div><button ref={closeButtonRef} type="button" className="profile-modal-close" onClick={closeEdit} aria-label="Close edit profile dialog"><FiX /></button></header><form onSubmit={save} noValidate><fieldset><legend>Personal Information</legend><div className="profile-edit-grid"><label>Full Name<input name="fullName" value={editForm.fullName} onChange={update} aria-invalid={Boolean(errors.fullName)} />{errors.fullName && <small role="alert">{errors.fullName}</small>}</label><label>Email Address<input name="email" type="email" value={editForm.email} onChange={update} aria-invalid={Boolean(errors.email)} />{errors.email && <small role="alert">{errors.email}</small>}</label><label>Mobile Number<input name="mobile" inputMode="numeric" value={editForm.mobile} onChange={update} aria-invalid={Boolean(errors.mobile)} />{errors.mobile && <small role="alert">{errors.mobile}</small>}</label><label>Gender<select name="gender" value={editForm.gender} onChange={update}><option value="">Select gender</option><option>Female</option><option>Male</option><option>Non-binary</option><option>Prefer not to say</option></select></label><label>Date of Birth<input name="dateOfBirth" type="date" value={editForm.dateOfBirth} onChange={update} aria-invalid={Boolean(errors.dateOfBirth)} />{errors.dateOfBirth && <small role="alert">{errors.dateOfBirth}</small>}</label></div></fieldset><fieldset><legend>Institutional Details</legend><div className="profile-edit-grid"><label>Department<input name="department" value={editForm.department} onChange={update} placeholder="Enter department manually" /></label><label>Designation<input name="designation" value={editForm.designation} onChange={update} placeholder="Enter designation" /></label></div></fieldset><fieldset><legend>Address &amp; Bio</legend><div className="profile-edit-grid"><label className="profile-edit-wide">Address<textarea name="address" value={editForm.address} onChange={update} placeholder="Enter address" /></label><label>PIN Code<input name="pincode" inputMode="numeric" value={editForm.pincode} onChange={update} aria-invalid={Boolean(errors.pincode)} placeholder="Enter 6-digit PIN code" />{errors.pincode && <small role="alert">{errors.pincode}</small>}</label><label>City / Block<input name="city" value={editForm.city} onChange={update} placeholder="Enter city or block" /></label><label>District<input name="district" value={editForm.district} onChange={update} placeholder="Enter district" /></label><label>State<input name="state" value={editForm.state} onChange={update} placeholder="Enter state" /></label><label className="profile-edit-wide">About Me<textarea name="bio" value={editForm.bio} onChange={update} placeholder="Tell us about yourself" /></label></div></fieldset><div className="profile-readonly-note"><FiShield /> Employee ID, role, status, last login, and other system-managed details cannot be edited.</div>{feedback?.type === 'error' && <p className="profile-form-error" role="alert">{feedback.message}</p>}<footer><button type="button" className="profile-button secondary" onClick={closeEdit} disabled={saving}>Cancel</button><button type="submit" className="profile-button" disabled={saving}>{saving ? 'Saving...' : 'Save Changes'}</button></footer></form></section></div>}
  </main></DashboardLayout>
}
