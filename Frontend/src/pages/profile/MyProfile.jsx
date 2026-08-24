import { useEffect, useState } from 'react'
import DashboardLayout from '../../layouts/DashboardLayout'
import { lookupIndianPincode, profileApi } from '../../api/apiEndpoints'
import './MyProfile.css'

const emptyErrors = { fullName: '', email: '', mobile: '', dateOfBirth: '', gender: '', department: '', address: '', postalCode: '', city: '', district: '', state: '' }
const iconPaths = {
  alert: <><circle cx="12" cy="12" r="9"/><path d="M12 7.5v5.5M12 16.5h.01"/></>,
  check: <><path d="M20 6 9 17l-5-5"/></>,
  edit: <><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L8 18l-4 1 1-4Z"/></>,
  mail: <><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/></>,
  phone: <><path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.4 19.4 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 2 .7 2.8a2 2 0 0 1-.5 2.1L8.1 9.8a16 16 0 0 0 6 6l1.2-1.2a2 2 0 0 1 2.1-.5c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.8 2.1Z"/></>,
  refresh: <><path d="M20 11a8 8 0 1 0-2.3 5.7"/><path d="M20 4v7h-7"/></>,
  shield: <><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z"/><path d="m9 12 2 2 4-4"/></>,
  user: <><circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/></>,
  building: <><path d="M3 21h18M6 21V8l6-5 6 5v13M9 21v-6h6v6M9 10h.01M15 10h.01"/></>,
  location: <><path d="M20 10c0 5-8 12-8 12S4 15 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="2.5"/></>,
}
const Icon = ({ name }) => <svg className="profile-icon" aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">{iconPaths[name]}</svg>

export default function MyProfile() {
  const [profile, setProfile] = useState(null)
  const [draft, setDraft] = useState(null)
  const [editing, setEditing] = useState(true)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState(emptyErrors)
  const [feedback, setFeedback] = useState(null)
  const [pincodeStatus, setPincodeStatus] = useState('')
  const [activeSection, setActiveSection] = useState('personal')
  const [completedSections, setCompletedSections] = useState([])
  const [maxUnlockedStep, setMaxUnlockedStep] = useState(0)

  const loadProfile = async () => {
    setLoading(true)
    setFeedback(null)
    try {
      const data = await profileApi.getProfile()
      setProfile(data)
      setDraft(data)
      setEditing(true)
    } catch (error) {
      setFeedback({ type: 'error', message: error.message || 'Unable to load your profile.' })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadProfile() }, [])

  const validate = (value = draft) => {
    const next = { ...emptyErrors }
    const safeValue = value || {}
    const fullName = String(safeValue.fullName || '').trim()
    const email = String(safeValue.email || '').trim()
    const mobile = String(safeValue.mobile || '').trim()
    if (!fullName) next.fullName = 'Full name is required.'
    else if (!/^[A-Za-z][A-Za-z .'-]{2,79}$/.test(fullName)) next.fullName = 'Enter a valid full name.'
    if (!email) next.email = 'Email address is required.'
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) next.email = 'Enter a valid email address.'
    if (!mobile) next.mobile = 'Mobile number is required.'
    else if (!/^[6-9]\d{9}$/.test(mobile)) next.mobile = 'Enter a valid 10-digit Indian mobile number.'
    if (!value.dateOfBirth) next.dateOfBirth = 'Date of birth is required.'
    else if (new Date(value.dateOfBirth) >= new Date()) next.dateOfBirth = 'Date of birth must be in the past.'
    if (!value.gender) next.gender = 'Gender is required.'
    if (!String(safeValue.department || '').trim()) next.department = 'Department is required.'
    if (!String(safeValue.address || '').trim()) next.address = 'Address is required.'
    if (!/^\d{6}$/.test(String(safeValue.postalCode || ''))) next.postalCode = 'Enter a valid 6-digit PIN code.'
    if (!String(safeValue.city || '').trim()) next.city = 'City is required.'
    if (!String(safeValue.district || '').trim()) next.district = 'District is required.'
    if (!String(safeValue.state || '').trim()) next.state = 'State is required.'
    return next
  }

  const sectionErrors = (section, value = draft) => {
    const allErrors = validate(value)
    const fields = {
      personal: ['fullName', 'email', 'mobile'],
      institutional: ['dateOfBirth', 'gender', 'department'],
      address: ['address', 'postalCode', 'city', 'district', 'state'],
    }[section] || []
    return Object.fromEntries(fields.filter((field) => allErrors[field]).map((field) => [field, allErrors[field]]))
  }

  const lookupPincode = async (pincode) => {
    setPincodeStatus('Finding location...')
    try {
      const location = await lookupIndianPincode(pincode)
      setDraft((current) => ({ ...current, ...location }))
      setPincodeStatus('City, district and state filled automatically.')
    } catch (error) {
      setPincodeStatus(error.message)
    }
  }

  const update = ({ target: { name, value } }) => {
    const cleanValue = name === 'mobile' ? value.replace(/\D/g, '').slice(0, 10) : name === 'postalCode' ? value.replace(/\D/g, '').slice(0, 6) : value
    const next = { ...draft, [name]: cleanValue }
    setDraft(next)
    if (errors[name]) setErrors((current) => ({ ...current, [name]: validate(next)[name] || '' }))
    setFeedback(null)
    if (name === 'postalCode') {
      setPincodeStatus('')
      if (/^\d{6}$/.test(cleanValue)) lookupPincode(cleanValue)
    }
  }

  const beginEditing = () => {
    setDraft(profile)
    setErrors(emptyErrors)
    setFeedback(null)
    setActiveSection('personal')
    setCompletedSections([])
    setMaxUnlockedStep(0)
    setEditing(true)
  }

  const cancelEditing = () => {
    setDraft(profile)
    setErrors(emptyErrors)
    setFeedback(null)
    setEditing(true)
    setActiveSection('personal')
    setCompletedSections([])
    setMaxUnlockedStep(0)
  }

  const sectionOrder = ['personal', 'institutional', 'address']
  const moveToSection = (direction) => {
    const currentIndex = sectionOrder.indexOf(activeSection)
    const nextIndex = currentIndex + direction
    if (nextIndex >= 0 && nextIndex < sectionOrder.length) setActiveSection(sectionOrder[nextIndex])
  }

  const saveAndNext = () => {
    const nextErrors = sectionErrors(activeSection)
    setErrors((current) => ({ ...current, ...emptyErrors, ...nextErrors }))
    if (Object.keys(nextErrors).length) return
    setCompletedSections((current) => current.includes(activeSection) ? current : [...current, activeSection])
    const nextSection = {
      personal: 'institutional',
      institutional: 'address',
    }[activeSection]
    const nextStep = sectionOrder.indexOf(nextSection)
    setMaxUnlockedStep((current) => Math.max(current, nextStep))
    if (nextSection) setActiveSection(nextSection)
  }

  const saveProfile = async (event) => {
    event.preventDefault()
    if (saving) return
    const nextErrors = validate()
    setErrors(nextErrors)
    if (Object.values(nextErrors).some(Boolean)) {
      const invalidSection = [
        ['personal', ['fullName', 'email', 'mobile']],
        ['institutional', ['dateOfBirth', 'gender', 'department']],
        ['address', ['address', 'postalCode', 'city', 'district', 'state']],
      ].find(([, fields]) => fields.some((field) => nextErrors[field]))?.[0]
      if (invalidSection) {
        setActiveSection(invalidSection)
      }
      setFeedback({ type: 'error', message: 'Please complete the required fields before submitting your profile.' })
      return
    }
    setSaving(true)
    setFeedback(null)
    try {
      const saved = await profileApi.updateProfile(draft)
      const completeProfile = {
        ...draft,
        fullName: saved.fullName || draft.fullName,
        email: saved.email || draft.email,
        mobile: saved.mobile || draft.mobile,
        role: saved.role || draft.role,
        identifier: saved.identifier || draft.identifier,
        updatedAt: saved.updatedAt || draft.updatedAt,
      }
      setProfile(completeProfile)
      setDraft(completeProfile)
      setEditing(true)
      setActiveSection('address')
      setCompletedSections(['personal', 'institutional', 'address'])
      setMaxUnlockedStep(2)
      setFeedback({ type: 'success', message: 'Your profile has been updated successfully.' })
    } catch (error) {
      setFeedback({ type: 'error', message: error.message || 'Unable to update your profile.' })
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <DashboardLayout><div className="profile-state"><span className="profile-spinner" /><h2>Loading your profile</h2><p>Please wait while we retrieve your information.</p></div></DashboardLayout>
  if (!profile || !draft) return <DashboardLayout><div className="profile-state error"><Icon name="alert" /><h2>Profile unavailable</h2><p>{feedback?.message || 'Unable to load your profile.'}</p><button className="profile-button" onClick={loadProfile}><Icon name="refresh" /> Try Again</button></div></DashboardLayout>

  const initials = String(profile.fullName || '').split(/\s+/).filter(Boolean).slice(0, 2).map((word) => word[0]).join('').toUpperCase() || 'U'
  const lastLogin = profile.updatedAt ? new Date(profile.updatedAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }) : 'Not available'

  return <DashboardLayout><main className="profile-page">
    <header className="profile-heading"><div><span className="profile-eyebrow">Account settings</span><h1>My Profile</h1><p>Review your account identity and keep your contact information current.</p></div>{!editing && <button className="profile-button" onClick={beginEditing}><Icon name="edit" /> Edit Profile</button>}</header>

    {feedback && <div className={`profile-feedback ${feedback.type}`} role={feedback.type === 'error' ? 'alert' : 'status'}><Icon name={feedback.type === 'success' ? 'check' : 'alert'} /><span>{feedback.message}</span></div>}

    <section className="profile-overview">
      <div className="profile-identity"><div className="profile-avatar" aria-hidden="true">{initials}</div><div><h2>{profile.fullName}</h2><p>{profile.email}</p><span className="profile-role"><Icon name="shield" /> {profile.role || 'User'}</span></div></div>
      <dl className="profile-facts"><div><dt>Employee ID</dt><dd>{profile.identifier || 'Not assigned'}</dd></div><div><dt>Last login</dt><dd>{lastLogin}</dd></div><div><dt>Account status</dt><dd><span className="profile-status"><i /> Active</span></dd></div></dl>
    </section>

    <section className="profile-content-card">
      <div className="profile-section-heading"><div className="profile-section-icon"><Icon name="user" /></div><div><h2>Personal information</h2><p>{editing ? 'Update the editable fields below, then save your changes.' : 'Your primary account and contact details.'}</p></div></div>

      <form onSubmit={saveProfile} noValidate>
        <nav className="profile-tabs" role="tablist" aria-label="Profile sections">
          <button type="button" role="tab" aria-selected={activeSection === 'personal'} aria-controls="profile-personal-panel" className={`${activeSection === 'personal' ? 'active' : ''} ${completedSections.includes('personal') ? 'completed' : ''}`} onClick={() => setActiveSection('personal')}><i className="profile-tab-number">{completedSections.includes('personal') ? '✓' : '1'}</i><Icon name="user" /><span><b>Personal Information</b><small>Account and contact</small></span></button>
          <button type="button" role="tab" aria-selected={activeSection === 'institutional'} aria-controls="profile-institutional-panel" className={`${activeSection === 'institutional' ? 'active' : ''} ${completedSections.includes('institutional') ? 'completed' : ''}`} disabled={editing && maxUnlockedStep < 1} onClick={() => setActiveSection('institutional')}><i className="profile-tab-number">{completedSections.includes('institutional') ? '✓' : '2'}</i><Icon name="building" /><span><b>Institutional Details</b><small>Academic information</small></span></button>
          <button type="button" role="tab" aria-selected={activeSection === 'address'} aria-controls="profile-address-panel" className={`${activeSection === 'address' ? 'active' : ''} ${completedSections.includes('address') ? 'completed' : ''}`} disabled={editing && maxUnlockedStep < 2} onClick={() => setActiveSection('address')}><i className="profile-tab-number">{completedSections.includes('address') ? '✓' : '3'}</i><Icon name="location" /><span><b>Address & Bio</b><small>Location and profile</small></span></button>
        </nav>
        {activeSection === 'personal' && <div id="profile-personal-panel" className="profile-panel" role="tabpanel"><div className="profile-panel-title"><h3>Personal details</h3><p>Manage your name and primary contact information.</p></div><div className="profile-fields">
          <label className="profile-field"><span>Full name <b>*</b></span><div className="profile-input"><Icon name="user" /><input name="fullName" value={draft.fullName} onChange={update} disabled={!editing} aria-invalid={Boolean(errors.fullName)} /></div>{errors.fullName && <small>{errors.fullName}</small>}</label>
          <label className="profile-field"><span>Email address <b>*</b></span><div className="profile-input"><Icon name="mail" /><input name="email" type="email" value={draft.email} onChange={update} disabled={!editing} aria-invalid={Boolean(errors.email)} /></div>{errors.email && <small>{errors.email}</small>}</label>
          <label className="profile-field"><span>Mobile number <b>*</b></span><div className="profile-input"><Icon name="phone" /><input name="mobile" inputMode="numeric" value={draft.mobile} onChange={update} disabled={!editing} aria-invalid={Boolean(errors.mobile)} /></div>{errors.mobile && <small>{errors.mobile}</small>}</label>
          <label className="profile-field"><span>Assigned role</span><div className="profile-input readonly"><Icon name="shield" /><input value={draft.role || 'User'} disabled /></div><em>Roles are managed by your administrator.</em></label>
        </div></div>}
        {activeSection === 'institutional' && <div id="profile-institutional-panel" className="profile-panel" role="tabpanel"><div className="profile-panel-title"><h3>Institutional details</h3><p>Your academic and institutional information.</p></div><div className="profile-fields">
          <label className="profile-field"><span>Date of birth <b>*</b></span><div className="profile-input"><input name="dateOfBirth" type="date" value={draft.dateOfBirth || ''} onChange={update} disabled={!editing} aria-invalid={Boolean(errors.dateOfBirth)} /></div>{errors.dateOfBirth && <small>{errors.dateOfBirth}</small>}</label>
          <label className="profile-field"><span>Gender <b>*</b></span><div className="profile-input"><select name="gender" value={draft.gender || ''} onChange={update} disabled={!editing} aria-invalid={Boolean(errors.gender)}><option value="">Select gender</option><option>Female</option><option>Male</option><option>Non-binary</option><option>Prefer not to say</option></select></div>{errors.gender && <small>{errors.gender}</small>}</label>
          <label className="profile-field"><span>Department <b>*</b></span><div className="profile-input"><input name="department" value={draft.department || ''} onChange={update} disabled={!editing} aria-invalid={Boolean(errors.department)} /></div>{errors.department && <small>{errors.department}</small>}</label>
          <label className="profile-field"><span>Designation / Programme</span><div className="profile-input"><input name="designation" value={draft.designation || ''} onChange={update} disabled={!editing} /></div></label>
        </div></div>}
        {activeSection === 'address' && <div id="profile-address-panel" className="profile-panel" role="tabpanel"><div className="profile-panel-title"><h3>Address and profile</h3><p>Enter the PIN code to automatically find the city, district and state.</p></div><div className="profile-fields">
          <label className="profile-field wide"><span>Address <b>*</b></span><div className="profile-input textarea"><textarea name="address" value={draft.address || ''} onChange={update} disabled={!editing} maxLength="250" aria-invalid={Boolean(errors.address)} /></div>{errors.address && <small>{errors.address}</small>}</label>
          <label className="profile-field"><span>PIN code <b>*</b></span><div className="profile-input"><input name="postalCode" inputMode="numeric" value={draft.postalCode || ''} onChange={update} disabled={!editing} maxLength="6" aria-invalid={Boolean(errors.postalCode)} /></div>{pincodeStatus && <small className="profile-lookup">{pincodeStatus}</small>}{errors.postalCode && <small>{errors.postalCode}</small>}</label>
          <label className="profile-field"><span>City / Block <b>*</b></span><div className="profile-input"><input name="city" value={draft.city || ''} onChange={update} disabled={!editing} aria-invalid={Boolean(errors.city)} /></div>{errors.city && <small>{errors.city}</small>}</label>
          <label className="profile-field"><span>District <b>*</b></span><div className="profile-input"><input name="district" value={draft.district || ''} onChange={update} disabled={!editing} aria-invalid={Boolean(errors.district)} /></div>{errors.district && <small>{errors.district}</small>}</label>
          <label className="profile-field"><span>State <b>*</b></span><div className="profile-input"><input name="state" value={draft.state || ''} onChange={update} disabled={!editing} aria-invalid={Boolean(errors.state)} /></div>{errors.state && <small>{errors.state}</small>}</label>
          <label className="profile-field wide"><span>About me</span><div className="profile-input textarea"><textarea name="bio" value={draft.bio || ''} onChange={update} disabled={!editing} maxLength="300" /></div><em>{(draft.bio || '').length}/300 characters</em></label>
        </div></div>}
        {editing && <footer className="profile-actions"><div className="profile-progress"><span>Step {sectionOrder.indexOf(activeSection) + 1} of {sectionOrder.length}</span><i><b style={{ width: `${((sectionOrder.indexOf(activeSection) + 1) / sectionOrder.length) * 100}%` }} /></i></div><div className="profile-action-buttons"><button type="button" className="profile-button ghost" onClick={cancelEditing} disabled={saving}>Cancel</button>{activeSection !== 'personal' && <button type="button" className="profile-button secondary" onClick={() => moveToSection(-1)} disabled={saving}>Back</button>}{activeSection !== 'address' ? <button type="button" className="profile-button" onClick={saveAndNext}>Save & Next <span aria-hidden="true">→</span></button> : <button type="submit" className="profile-button" disabled={saving}>{saving ? <><span className="profile-button-spinner" /> Submitting...</> : <><Icon name="check" /> Submit Profile</>}</button>}</div></footer>}
      </form>
    </section>
  </main></DashboardLayout>
}
