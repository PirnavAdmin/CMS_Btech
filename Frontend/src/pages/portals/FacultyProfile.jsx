import { useEffect, useId, useRef, useState } from 'react'
import { FiEdit2, FiMapPin, FiShield, FiUser } from 'react-icons/fi'
import { profileApi } from '../../api/apiEndpoints.js'
import { getAuthStorage } from '../../auth/auth.js'
import { PortalDialog } from '../../components/portals/PortalUI.jsx'
import '../profile/MyProfile.css'
import './faculty-profile.css'

const display = value => value === undefined || value === null || String(value).trim() === '' ? '—' : value
const date = value => value ? String(value).slice(0, 10) : ''
const initials = name => String(name || 'Faculty').split(/\s+/).filter(Boolean).slice(0, 2).map(word => word[0]).join('').toUpperCase()
const lastLogin = value => {
  if (!value) return '—'
  const raw = String(value), parsed = new Date(/(Z|[+-]\d{2}:?\d{2})$/i.test(raw) ? raw : `${raw}Z`)
  return Number.isNaN(+parsed) ? '—' : new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Kolkata' }).format(parsed)
}
const editableKeys = ['fullName', 'email', 'mobile', 'dateOfBirth', 'gender', 'houseNumber', 'address', 'pincode', 'city', 'district', 'state', 'permanentHouseNumber', 'permanentAddress', 'permanentPincode', 'permanentCity', 'permanentDistrict', 'permanentState', 'bio']
const addressKeys = [['houseNumber', 'permanentHouseNumber'], ['address', 'permanentAddress'], ['pincode', 'permanentPincode'], ['city', 'permanentCity'], ['district', 'permanentDistrict'], ['state', 'permanentState']]
function Detail({ label, value, wide = false }) { return <div className={`profile-detail${wide ? ' wide' : ''}`}><span>{label}</span><strong title={String(display(value))}>{display(value)}</strong></div> }
function Section({ icon: Icon, title, children }) { return <div className="profile-preview-group"><header><span><Icon /></span><div><h2>{title}</h2><p>Saved information from your account</p></div></header><div className="profile-detail-grid">{children}</div></div> }
function Address({ title, profile, permanent = false }) {
  const key = name => permanent ? `permanent${name[0].toUpperCase()}${name.slice(1)}` : name
  return <article className="profile-address-card"><header><FiMapPin /><h3>{title}</h3></header><dl className="profile-address-primary">{[['houseNumber', 'House No'], ['address', 'Address']].map(([field, label]) => <div key={field}><dt>{label}</dt><dd>{display(profile[key(field)])}</dd></div>)}</dl><dl>{[['city', 'City / Block'], ['district', 'District'], ['state', 'State'], ['pincode', 'PIN Code']].map(([field, label]) => <div key={field}><dt>{label}</dt><dd>{display(profile[key(field)])}</dd></div>)}</dl></article>
}
function validate(form) {
  const errors = {}
  if (!/^[A-Za-z][A-Za-z .'-]{2,79}$/.test(form.fullName.trim())) errors.fullName = 'Enter a valid full name (3–80 characters).'
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) errors.email = 'Enter a valid email address.'
  if (!/^[6-9]\d{9}$/.test(form.mobile.trim())) errors.mobile = 'Enter a valid 10-digit Indian mobile number.'
  if (form.dateOfBirth && (Number.isNaN(Date.parse(form.dateOfBirth)) || new Date(form.dateOfBirth) >= new Date())) errors.dateOfBirth = 'Date of birth must be in the past.'
  for (const field of ['pincode', 'permanentPincode']) if (form[field] && !/^\d{6}$/.test(form[field])) errors[field] = 'Enter a valid 6-digit PIN code.'
  return errors
}
export default function FacultyProfile() {
  const [profile, setProfile] = useState(null), [loading, setLoading] = useState(true), [loadError, setLoadError] = useState(''), [feedback, setFeedback] = useState(''), [open, setOpen] = useState(false), [form, setForm] = useState({}), [errors, setErrors] = useState({}), [serverError, setServerError] = useState(''), [saving, setSaving] = useState(false), [sameAddress, setSameAddress] = useState(false)
  const formRef = useRef(null), id = useId()
  const load = async () => { setLoading(true); setLoadError(''); try { setProfile(await profileApi.getProfile()) } catch (e) { setLoadError(e.message || 'Unable to load your profile.') } finally { setLoading(false) } }
  useEffect(() => { let active = true; profileApi.getProfile().then(value => { if (active) setProfile(value) }).catch(e => { if (active) setLoadError(e.message) }).finally(() => { if (active) setLoading(false) }); return () => { active = false } }, [])
  const edit = () => { setForm(Object.fromEntries(editableKeys.map(key => [key, key === 'dateOfBirth' ? date(profile[key]) : profile[key] || '']))); setSameAddress(false); setErrors({}); setServerError(''); setFeedback(''); setOpen(true) }
  const save = async event => {
    event.preventDefault()
    if (saving) return
    const next = { ...form }
    if (sameAddress) addressKeys.forEach(([current, permanent]) => { next[permanent] = next[current] })
    const invalid = validate(next); setErrors(invalid); setServerError('')
    if (Object.keys(invalid).length) { formRef.current?.elements.namedItem(Object.keys(invalid)[0])?.focus(); return }
    const payload = { ...profile, ...Object.fromEntries(editableKeys.map(key => [key, String(next[key] || '').trim()])) }
    setSaving(true)
    try {
      await profileApi.updateProfile(payload)
      let saved = payload
      let message = 'Profile updated successfully.'
      try { saved = await profileApi.getProfile() } catch { message = 'Profile saved. The latest details could not be reloaded; refresh to verify.' }
      setProfile(saved); setOpen(false); setFeedback(message)
      getAuthStorage()?.setItem('btech-user-name', saved.fullName || payload.fullName)
      window.dispatchEvent(new CustomEvent('btech-profile-updated', { detail: { fullName: saved.fullName || payload.fullName } }))
    } catch (e) { setServerError(e.message || 'Unable to save your profile. Please try again.') }
    finally { setSaving(false) }
  }
  const field = (name, label, type = 'text', options = {}) => <div className={`faculty-profile-field${options.wide ? ' wide' : ''}`}><label htmlFor={`${id}-${name}`}>{label}{options.required ? ' *' : ''}</label>{type === 'textarea' ? <textarea id={`${id}-${name}`} name={name} rows={3} maxLength={name === 'bio' ? 1000 : 500} value={form[name] || ''} onChange={e => setForm({ ...form, [name]: e.target.value })} /> : <input id={`${id}-${name}`} name={name} type={type} required={options.required} maxLength={name === 'mobile' ? 10 : name.includes('incode') ? 6 : 150} max={type === 'date' ? new Date().toLocaleDateString('en-CA') : undefined} value={form[name] || ''} disabled={options.disabled} inputMode={name === 'mobile' || name.includes('incode') ? 'numeric' : undefined} aria-invalid={!!errors[name]} aria-describedby={errors[name] ? `${id}-${name}-error` : undefined} onChange={e => { setForm({ ...form, [name]: e.target.value }); setErrors(previous => ({ ...previous, [name]: undefined })) }} />}{errors[name] && <small id={`${id}-${name}-error`} role="alert">{errors[name]}</small>}</div>
  if (loading) return <main className="profile-page faculty-profile-page"><div className="profile-state" role="status"><span className="profile-spinner" /><h2>Loading your profile</h2><p>Please wait while we retrieve your information.</p></div></main>
  if (!profile) return <main className="profile-page faculty-profile-page"><section className="profile-error-card" role="alert"><h2>Profile unavailable</h2><p>{loadError}</p><button className="profile-button" onClick={load}>Try Again</button></section></main>
  return <main className="profile-page faculty-profile-page"><header className="profile-heading"><div><p className="profile-eyebrow">Account</p><h1>My Profile</h1><p>Review your saved identity and account information.</p></div><button className="profile-button" onClick={edit}><FiEdit2 /> Edit Profile</button></header>{feedback && <div className="profile-feedback success" role="status">{feedback}</div>}
    <section className="profile-overview"><div className="profile-identity"><div className="profile-avatar" aria-hidden="true">{initials(profile.fullName)}</div><div><h2 className="profile-name">{display(profile.fullName)}</h2><p className="profile-email">{display(profile.email)}</p><span className="profile-role"><FiShield /> Teaching Faculty</span></div></div><dl className="profile-facts"><div><dt>Employee ID</dt><dd>{display(profile.identifier)}</dd></div><div><dt>Last Login</dt><dd>{lastLogin(profile.lastLoginAt)}</dd></div><div><dt>Account Status</dt><dd className="profile-status"><i />{display(profile.status)}</dd></div></dl></section>
    <section className="profile-preview-section profile-details-card"><Section icon={FiUser} title="Personal Information"><Detail label="Full Name" value={profile.fullName} /><Detail label="Email Address" value={profile.email} /><Detail label="Mobile Number" value={profile.mobile} /><Detail label="Gender" value={profile.gender} /><Detail label="Date of Birth" value={date(profile.dateOfBirth)} /></Section><Section icon={FiShield} title="Institutional Details"><Detail label="Employee ID" value={profile.identifier} /><Detail label="Assigned Role" value={profile.role || 'Teaching Faculty'} /><Detail label="Department" value={profile.department} /><Detail label="Designation" value={profile.designation} /></Section><Section icon={FiMapPin} title="Address & Bio"><Address title="Current Address" profile={profile} /><Address title="Permanent Address" profile={profile} permanent /><Detail label="About Me" value={profile.bio} wide /></Section></section>
    {open && <PortalDialog title="Edit Profile" onClose={() => { if (!saving) setOpen(false) }}><div className="faculty-profile-editor"><p>Update your personal and contact information.</p>{serverError && <p className="faculty-profile-save-error" role="alert">{serverError}</p>}<form ref={formRef} onSubmit={save} noValidate aria-busy={saving}><fieldset disabled={saving}><legend>Personal Information</legend><div className="faculty-profile-edit-grid">{field('fullName', 'Full Name', 'text', { required: true })}{field('email', 'Email Address', 'email', { required: true })}{field('mobile', 'Mobile Number', 'tel', { required: true })}{field('dateOfBirth', 'Date of Birth', 'date')}<div className="faculty-profile-field"><label htmlFor={`${id}-gender`}>Gender</label><select id={`${id}-gender`} name="gender" value={form.gender} onChange={e => setForm({ ...form, gender: e.target.value })}><option value="">Select gender</option>{['Male', 'Female', 'Other', 'Prefer not to say'].map(value => <option key={value}>{value}</option>)}</select></div></div><h3>Current Address</h3><div className="faculty-profile-edit-grid">{field('houseNumber', 'House Number')}{field('pincode', 'PIN Code')}{field('address', 'Address', 'textarea', { wide: true })}{field('city', 'City / Block')}{field('district', 'District')}{field('state', 'State')}</div><h3>Permanent Address</h3><label className="faculty-profile-same-address"><input type="checkbox" checked={sameAddress} onChange={e => setSameAddress(e.target.checked)} />Same as current address</label>{!sameAddress && <div className="faculty-profile-edit-grid">{field('permanentHouseNumber', 'House Number')}{field('permanentPincode', 'PIN Code')}{field('permanentAddress', 'Address', 'textarea', { wide: true })}{field('permanentCity', 'City / Block')}{field('permanentDistrict', 'District')}{field('permanentState', 'State')}</div>}<h3>About Me</h3><div className="faculty-profile-edit-grid">{field('bio', 'Bio', 'textarea', { wide: true })}</div><p className="faculty-profile-official-note">Employee ID, role, department and designation are maintained by your college administrator.</p></fieldset><div className="portal-actions"><button type="button" disabled={saving} onClick={() => setOpen(false)}>Cancel</button><button type="submit" className="primary" disabled={saving}>{saving ? 'Saving...' : 'Save Changes'}</button></div></form></div></PortalDialog>}
  </main>
}
