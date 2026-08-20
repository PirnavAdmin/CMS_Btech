import { useEffect, useState } from 'react'
import DashboardLayout from '../../layouts/DashboardLayout'
import { lookupIndianPincode, profileApi } from './profileApi'
import './MyProfile.css'

export default function MyProfile() {
  const [profile, setProfile] = useState(null)
  const [draft, setDraft] = useState(null)
  const [editing, setEditing] = useState(false)
  const [errors, setErrors] = useState({})
  const [saving, setSaving] = useState(false)
  const [notice, setNotice] = useState('')
  const [pincodeStatus, setPincodeStatus] = useState('')
  const [lookingUpPincode, setLookingUpPincode] = useState(false)

  useEffect(() => { profileApi.getProfile().then((data) => { setProfile(data); setDraft(data) }) }, [])
  if (!profile || !draft) return <DashboardLayout><p>Loading profile…</p></DashboardLayout>

  const validate = (value = draft) => {
    const next = {}
    if (!value.fullName.trim()) next.fullName = 'Full name is required.'
    else if (!/^[A-Za-z][A-Za-z .'-]{2,79}$/.test(value.fullName.trim())) next.fullName = 'Enter a valid full name.'
    if (!value.email.trim()) next.email = 'Email address is required.'
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.email)) next.email = 'Enter a valid email address.'
    if (!value.mobile.trim()) next.mobile = 'Mobile number is required.'
    else if (!/^[6-9]\d{9}$/.test(value.mobile)) next.mobile = 'Enter a valid 10-digit Indian mobile number.'
    if (!value.dateOfBirth) next.dateOfBirth = 'Date of birth is required.'
    else if (new Date(value.dateOfBirth) >= new Date()) next.dateOfBirth = 'Date of birth must be in the past.'
    if (!value.gender) next.gender = 'Gender is required.'
    if (!value.department.trim()) next.department = 'Department is required.'
    if (!value.address.trim()) next.address = 'Address is required.'
    if (!value.postalCode) next.postalCode = 'PIN code is required.'
    else if (!/^\d{6}$/.test(value.postalCode)) next.postalCode = 'PIN code must contain exactly 6 digits.'
    if (!value.city.trim()) next.city = 'City is required.'
    if (!value.district.trim()) next.district = 'District is required.'
    if (!value.state.trim()) next.state = 'State is required.'
    return next
  }
  const fetchPincode = async (pincode) => {
    setLookingUpPincode(true)
    setPincodeStatus('Finding city, district, and state…')
    try {
      const location = await lookupIndianPincode(pincode)
      setDraft((current) => ({ ...current, ...location }))
      setErrors((current) => ({ ...current, postalCode: '', city: '', district: '', state: '' }))
      setPincodeStatus('Location filled from the PIN code. Please verify the details.')
    } catch (lookupError) {
      setErrors((current) => ({ ...current, postalCode: lookupError.message }))
      setPincodeStatus('')
    } finally {
      setLookingUpPincode(false)
    }
  }
  const update = ({ target: { name, value } }) => {
    const clean = name === 'mobile' ? value.replace(/\D/g, '').slice(0, 10) : name === 'postalCode' ? value.replace(/\D/g, '').slice(0, 6) : value
    const next = { ...draft, [name]: clean }
    setDraft(next)
    if (errors[name]) setErrors(validate(next))
    if (name === 'postalCode') {
      setPincodeStatus('')
      if (/^\d{6}$/.test(clean)) fetchPincode(clean)
    }
  }
  const save = async () => {
    const nextErrors = validate()
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length) return
    setSaving(true)
    const saved = await profileApi.updateProfile(draft)
    setProfile(saved); setDraft(saved); setEditing(false); setSaving(false); setNotice('Your profile has been updated successfully.')
  }
  const cancel = () => { setDraft(profile); setErrors({}); setEditing(false) }
  const initials = profile.fullName.split(/\s+/).slice(0, 2).map((word) => word[0]).join('').toUpperCase()
  const required = ['fullName', 'email', 'mobile', 'dateOfBirth', 'gender', 'department', 'address', 'city', 'district', 'state', 'postalCode']
  const field = (name, label, options) => <label className={`profile-field ${['address', 'bio'].includes(name) ? 'wide' : ''}`} key={name}><span>{label}{required.includes(name) && <span className="profile-required"> *</span>}</span>{name === 'bio' || name === 'address' ? <textarea name={name} value={draft[name] || ''} disabled={!editing} onChange={update} maxLength={name === 'bio' ? 300 : 250} /> : options ? <select name={name} value={draft[name] || ''} disabled={!editing} onChange={update}><option value="">Select</option>{options.map((item) => <option key={item}>{item}</option>)}</select> : <input name={name} value={draft[name] || ''} disabled={!editing || (['city', 'district', 'state'].includes(name) && lookingUpPincode)} onChange={update} type={name === 'email' ? 'email' : name === 'dateOfBirth' ? 'date' : 'text'} aria-invalid={Boolean(errors[name])} />}{name === 'postalCode' && pincodeStatus && <span className="profile-lookup" role="status">{pincodeStatus}</span>}{errors[name] && <span className="profile-error" role="alert">{errors[name]}</span>}</label>

  return <DashboardLayout><div className="profile-page">
    <header className="profile-heading"><div><h1>My Profile</h1><p>View and manage your personal and institutional information.</p></div>{!editing && <button className="profile-button" onClick={() => { setEditing(true); setNotice('') }}>Edit Profile</button>}</header>
    {notice && <p className="profile-notice" role="status">{notice}</p>}
    <div className="profile-grid"><aside className="profile-card profile-summary"><div className="profile-avatar" aria-hidden="true">{initials}</div><h2>{profile.fullName}</h2><p>{profile.email}</p><span className="profile-role">{profile.role}</span><div className="profile-meta"><div><span>User ID</span><strong>{profile.identifier}</strong></div><div><span>Department</span><strong>{profile.department || 'Not provided'}</strong></div><div><span>Last Updated</span><strong>{new Date(profile.updatedAt).toLocaleDateString()}</strong></div></div></aside>
      <section className="profile-card"><h2>Profile Information</h2><div className="profile-fields">
        {field('fullName', 'Full Name')}{field('email', 'Email Address')}{field('mobile', 'Mobile Number')}
        <label className="profile-field"><span>Role</span><input value={draft.role} disabled /></label>
        {field('dateOfBirth', 'Date of Birth')}{field('gender', 'Gender', ['Female', 'Male', 'Non-binary', 'Prefer not to say'])}
        {field('department', 'Department')}{field('designation', 'Designation / Programme')}
        {field('address', 'Address')}{field('postalCode', 'PIN Code')}{field('city', 'City / Block')}{field('district', 'District')}{field('state', 'State')}{field('bio', 'About Me')}
      </div>{editing && <div className="profile-actions"><button className="profile-button secondary" onClick={cancel}>Cancel</button><button className="profile-button" disabled={saving} onClick={save}>{saving ? 'Saving…' : 'Save Changes'}</button></div>}</section>
    </div>
  </div></DashboardLayout>
}
