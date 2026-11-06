import { ProjectSelect as SearchableSelectImports_ProjectSelect } from '../../components/SearchableSelect'
import GlobalSettings from '../settings/GlobalSettings.jsx'
import { showWarning as toastImports_showWarning } from '../../utils/toast'
import useToastStateImports_default from '../../hooks/useToastState'
import { useEffect as reactImports_useEffect, useRef as reactImports_useRef, useState as reactImports_useState } from 'react'
import { FiEdit2, FiMail, FiMapPin, FiPhone, FiShield, FiUser, FiX } from 'react-icons/fi'
import DashboardLayoutImports_default from '../../layouts/DashboardLayout'
import { API_BASE_URL as apiEndpointsImports_API_BASE_URL, lookupIndianPincode as apiEndpointsImports_lookupIndianPincode, profileApi as apiEndpointsImports_profileApi } from '../../api/apiEndpoints'
import { getDepartments as collegeApiImports_getDepartments } from '../../auth/collegeApi'
import { getUserRole as authImports_getUserRole, signOut as authImports_signOut } from '../../auth/auth'
import { ROLES as rolesImports_ROLES } from '../../auth/roles'
import { Navigate as react_router_domImports_Navigate, useSearchParams as react_router_domImports_useSearchParams, useNavigate as react_router_domImports_useNavigate } from 'react-router-dom'
import './MyProfile.css'

// MyProfile screen and private helpers.
const MyProfileScreen = (() => {
const ProjectSelect = SearchableSelectImports_ProjectSelect
const showWarning = toastImports_showWarning
const useToastState = useToastStateImports_default
const useEffect = reactImports_useEffect
const useRef = reactImports_useRef
const useState = reactImports_useState
const useSearchParams = react_router_domImports_useSearchParams
const useNavigate = react_router_domImports_useNavigate
const DashboardLayout = DashboardLayoutImports_default
const lookupIndianPincode = apiEndpointsImports_lookupIndianPincode
const profileApi = apiEndpointsImports_profileApi
const API_BASE_URL = apiEndpointsImports_API_BASE_URL
const getDepartments = collegeApiImports_getDepartments
const getUserRole = authImports_getUserRole
const signOut = authImports_signOut
const ROLES = rolesImports_ROLES

const emptyForm = { fullName: '', email: '', mobile: '', dateOfBirth: '', gender: '', departmentId: '', designation: '', collegeType: '', universityName: '', collegeEmail: '', collegeMobile: '', collegePhone: '', collegeAddressLine1: '', collegeAddressLine2: '', collegeCity: '', collegeDistrict: '', collegeState: '', collegeCountry: '', collegePincode: '', collegeWebsite: '', houseNumber: '', address: '', permanentHouseNumber: '', permanentAddress: '', sameAsCurrentAddress: false, pincode: '', city: '', district: '', state: '', permanentPincode: '', permanentCity: '', permanentDistrict: '', permanentState: '', bio: '' }
const emptyErrors = {}
const profileFieldLabel = (field) => ({ fullName: 'Full name', email: 'Email address', mobile: 'Mobile number', houseNumber: 'Current house number', pincode: 'Current PIN code', permanentHouseNumber: 'Permanent house number', permanentPincode: 'Permanent PIN code' })[field] || field.replace(/([A-Z])/g, ' $1')
const profileErrorMessage = (error, fallback) => {
  if (error?.status === 401) return 'Your session has expired. Please sign in again.'
  if (error?.status >= 500) return 'Profile information is temporarily unavailable.'
  const message = String(error?.message || '').trim()
  return /\/api\/v\d+|\b(?:GET|POST|PUT|PATCH|DELETE)\b/i.test(message) ? fallback : message || fallback
}
const display = (value) => value === null || value === undefined || String(value).trim() === '' ? '-' : value
const formatLastLogin = (value) => {
  if (!value) return '-'
  const raw = String(value).trim()
  const date = new Date(/(Z|[+-]\d{2}:?\d{2})$/i.test(raw) ? raw : `${raw}Z`)
  return Number.isNaN(date.getTime()) ? '-' : new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Kolkata' }).format(date)
}
const formatDateOnly = (value) => {
  if (!value) return '-'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? display(value).split('T')[0] : new Intl.DateTimeFormat('en-IN', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'Asia/Kolkata' }).format(date)
}
const initials = (name) => String(name || '').split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toUpperCase() || 'U'
const profilePhotoUrl = (path) => {
  const value = String(path || '').trim()
  if (!value || /^(data:|https?:\/\/)/i.test(value)) return value
  const apiBase = import.meta.env.DEV ? '' : API_BASE_URL
  return `${apiBase}/${value.replace(/^\/+/, '')}`
}
const validate = (form) => {
  const errors = {}
  const name = form.fullName.trim()
  const email = form.email.trim()
  if (!name) errors.fullName = 'Full name is required.'
  else if (!/^[A-Za-z][A-Za-z .'-]{2,79}$/.test(name)) errors.fullName = 'Enter a valid full name.'
  if (!email) errors.email = 'Email address is required.'
  else if (!/^\S+@\S+\.\S+$/.test(email)) errors.email = 'Enter a valid email address.'
  if (!/^[6-9]\d{9}$/.test(form.mobile)) errors.mobile = 'Enter a valid 10-digit Indian mobile number.'
  if (!form.houseNumber.trim()) errors.houseNumber = 'House number is required.'
  if (form.dateOfBirth && new Date(form.dateOfBirth) >= new Date()) errors.dateOfBirth = 'Date of birth must be in the past.'
  if (form.pincode && !/^\d{6}$/.test(form.pincode)) errors.pincode = 'Enter a valid 6-digit PIN code.'
  if (form.permanentPincode && !/^\d{6}$/.test(form.permanentPincode)) errors.permanentPincode = 'Enter a valid 6-digit PIN code.'
  return errors
}

function DetailSection({ icon: Icon, title, children, className = '' }) { return <div className={`profile-preview-group ${className}`}><header><span><Icon /></span><div><h2>{title}</h2><p>Saved information from your account</p></div></header><div className="profile-detail-grid">{children}</div></div> }
function Detail({ label, value, wide = false }) { const email = label === 'Email Address'; return <div className={`${wide ? 'profile-detail wide' : 'profile-detail'}${email ? ' profile-detail-email' : ''}`}><span>{label}</span><strong title={display(value)}>{display(value)}</strong></div> }
function AddressCard({ title, houseNumber, address, city, district, state, pincode }) { return <article className="profile-address-card"><header><FiMapPin/><h3>{title}</h3></header><dl className="profile-address-primary"><div><dt>House No</dt><dd>{display(houseNumber)}</dd></div><div><dt>Address</dt><dd>{display(address)}</dd></div></dl><dl><div><dt>City / Block</dt><dd>{display(city)}</dd></div><div><dt>District</dt><dd>{display(district)}</dd></div><div><dt>State</dt><dd>{display(state)}</dd></div><div><dt>PIN Code</dt><dd>{display(pincode)}</dd></div></dl></article> }

function MyProfile() {
  const [queryParams] = useSearchParams()
  const navigate = useNavigate()
  const forceProfileSetup = queryParams.get('setup') === '1' || queryParams.get('profileSetup') === '1'
  const passwordSetupPending = queryParams.get('setup') === '1' && [localStorage, sessionStorage].some((storage) => storage.getItem('btech-must-change-password') === 'true')
  const sessionProfileIncomplete = [localStorage, sessionStorage].some((storage) => storage.getItem('btech-profile-completed') === 'false')
  const isStudent = getUserRole() === ROLES.STUDENT
  const [profile, setProfile] = useState(null)
  const [departments, setDepartments] = useState([])
  const [loading, setLoading] = useState(true)
  const [feedback, setFeedback] = useToastState(null, 'success')
  const [editOpen, setEditOpen] = useState(false)
  const [editForm, setEditForm] = useState(emptyForm)
  const [errors, setErrors] = useState(emptyErrors)
  const [saving, setSaving] = useState(false)
  const [pincodeStatus, setPincodeStatus] = useState({ current: '', permanent: '' })
  const closeButtonRef = useRef(null)
  const mandatorySetup = !passwordSetupPending && (profile?.profileCompleted === false || (forceProfileSetup && profile?.profileCompleted == null && sessionProfileIncomplete))

  const loadProfile = async () => {
    setLoading(true); setFeedback(null)
    try { const loadedProfile = await profileApi.getProfile(); setProfile(loadedProfile); if (queryParams.get('profileSetup') === '1' && loadedProfile.profileCompleted === true) navigate('/my-profile', { replace: true }) }
    catch (error) { setProfile(null); setFeedback({ type: 'error', message: profileErrorMessage(error, 'Unable to load profile information.') }) }
    finally { setLoading(false) }
  }
  useEffect(() => { loadProfile() }, [])
  useEffect(() => {
    let active = true
    const collegeId = profile?.collegeId || localStorage.getItem('btech-user-college-id') || sessionStorage.getItem('btech-user-college-id')
    getDepartments()
      .then((response) => {
        const rows = response?.data?.data ?? response?.data ?? response
        if (active) setDepartments(Array.isArray(rows) ? rows.filter((item) => String(item.status ?? 'Active').toLowerCase() !== 'inactive' && (!collegeId || String(item.collegeId ?? item.college_id) === String(collegeId))) : [])
      })
      .catch(() => { if (active) setDepartments([]) })
    return () => { active = false }
  }, [profile?.collegeId])
  useEffect(() => {
    if (feedback?.type !== 'success') return undefined
    const timer = setTimeout(() => setFeedback(null), 2000)
    return () => clearTimeout(timer)
  }, [feedback, setFeedback])

  const openEdit = () => { setEditForm({ ...emptyForm, fullName: profile.fullName || '', email: profile.email || '', mobile: profile.mobile || '', dateOfBirth: profile.dateOfBirth ? String(profile.dateOfBirth).slice(0, 10) : '', gender: profile.gender || '', departmentId: profile.departmentId || '', designation: profile.designation || '', collegeType: profile.collegeType || '', universityName: profile.universityName || '', collegeEmail: profile.collegeEmail || '', collegeMobile: profile.collegeMobile || '', collegePhone: profile.collegePhone || '', collegeAddressLine1: profile.collegeAddressLine1 || '', collegeAddressLine2: profile.collegeAddressLine2 || '', collegeCity: profile.collegeCity || '', collegeDistrict: profile.collegeDistrict || '', collegeState: profile.collegeState || '', collegeCountry: profile.collegeCountry || '', collegePincode: profile.collegePincode || '', collegeWebsite: profile.collegeWebsite || '', houseNumber: profile.houseNumber || '', address: profile.address || '', permanentHouseNumber: profile.permanentHouseNumber || '', permanentAddress: profile.permanentAddress || '', sameAsCurrentAddress: false, pincode: profile.pincode || profile.postalCode || '', city: profile.city || '', district: profile.district || '', state: profile.state || '', permanentPincode: profile.permanentPincode || '', permanentCity: profile.permanentCity || '', permanentDistrict: profile.permanentDistrict || '', permanentState: profile.permanentState || '', bio: profile.bio || '' }); setErrors({}); setPincodeStatus({ current: '', permanent: '' }); setFeedback(null); setEditOpen(true) }
  useEffect(() => { if (mandatorySetup && profile && !editOpen) openEdit() }, [mandatorySetup, profile, editOpen])
  const closeEdit = () => { if (!saving && !mandatorySetup) { setEditOpen(false); setErrors({}); setPincodeStatus({ current: '', permanent: '' }); setEditForm(emptyForm) } }
  useEffect(() => {
    if (!editOpen) return undefined
    closeButtonRef.current?.focus()
    const onKeyDown = (event) => { if (event.key === 'Escape') closeEdit() }
    document.body.style.overflow = 'hidden'
    document.querySelectorAll('.profile-edit-dialog input[name="fullName"]').forEach((input) => { input.readOnly = false; input.removeAttribute('aria-readonly') })
    window.addEventListener('keydown', onKeyDown)
    return () => { document.body.style.overflow = ''; window.removeEventListener('keydown', onKeyDown) }
  }, [editOpen, saving])
  const update = async (event) => { const name = event.target.name, pinField=['pincode','permanentPincode'].includes(name), value = event.target.type === 'checkbox' ? event.target.checked : name === 'mobile' || pinField ? event.target.value.replace(/\D/g, '').slice(0, pinField ? 6 : 10) : event.target.value; let next = { ...editForm, [name]: value }; if (name === 'sameAsCurrentAddress') { next = value ? { ...next, permanentHouseNumber: next.houseNumber, permanentAddress: next.address, permanentPincode: next.pincode, permanentCity: next.city, permanentDistrict: next.district, permanentState: next.state } : { ...next, permanentHouseNumber: '', permanentAddress: '', permanentPincode: '', permanentCity: '', permanentDistrict: '', permanentState: '' }; setPincodeStatus(current => ({ ...current, permanent: '' })) } if(next.sameAsCurrentAddress){const map={houseNumber:'permanentHouseNumber',address:'permanentAddress',pincode:'permanentPincode',city:'permanentCity',district:'permanentDistrict',state:'permanentState'};if(map[name])next[map[name]]=value} setEditForm(next); setErrors(validate(next)); setFeedback(null); if (pinField) { const key=name === 'pincode'?'current':'permanent'; setPincodeStatus(current=>({...current,[key]:''})); if (/^\d{6}$/.test(value)) { setPincodeStatus(current=>({...current,[key]:'Finding location...'})); try { const location = await lookupIndianPincode(value); setEditForm((current) => name === 'pincode' ? ({ ...current, ...location, ...(current.sameAsCurrentAddress ? { permanentPincode:value, permanentCity:location.city || '', permanentDistrict:location.district || '', permanentState:location.state || '' } : {}) }) : ({ ...current, permanentCity:location.city || '', permanentDistrict:location.district || '', permanentState:location.state || '' })); setPincodeStatus(current=>({...current,[key]:'City, district and state filled automatically.'})) } catch (error) { setPincodeStatus(current=>({...current,[key]:error.message || 'PIN lookup failed. Enter the location manually.'})) } } } }
  const save = async (event) => {
    event.preventDefault(); const nextErrors = validate(editForm); setErrors(nextErrors); if (saving) return; if (Object.keys(nextErrors).length) { const field = Object.keys(nextErrors)[0]; setFeedback({ type: 'error', message: `${profileFieldLabel(field)}: ${nextErrors[field]}` }); return }
    setSaving(true); setFeedback(null)
    try {
      await profileApi.updateProfile(editForm)
      const updatedProfile = await profileApi.getProfile()
      const savedFields = ['fullName', 'email', 'mobile', 'collegeType', 'universityName', 'collegeEmail', 'collegeMobile', 'collegePhone', 'collegeAddressLine1', 'collegeAddressLine2', 'collegeCity', 'collegeDistrict', 'collegeState', 'collegeCountry', 'collegePincode', 'collegeWebsite', 'houseNumber', 'address', 'pincode', 'city', 'district', 'state', 'permanentHouseNumber', 'permanentAddress', 'permanentPincode', 'permanentCity', 'permanentDistrict', 'permanentState']
      const fieldsPersisted = savedFields.every((field) => String(updatedProfile[field] || '').trim() === String(editForm[field] || '').trim())
      if (!fieldsPersisted) {
        setFeedback({ type: 'error', message: 'Your profile could not be verified after saving. Please try again.' })
        return
      }
      const profileSetupComplete = updatedProfile.profileCompleted === true
      if (mandatorySetup && !profileSetupComplete) {
        setProfile(updatedProfile)
        setFeedback({ type: 'error', message: 'Your profile was saved, but setup completion could not be confirmed because the backend did not return its completion status. Restart or deploy the latest backend, then try again.' })
        return
      }
      setProfile({ ...updatedProfile, profileCompleted: profileSetupComplete ? true : updatedProfile.profileCompleted })
      setEditOpen(false)
      const authStorage = [localStorage, sessionStorage].find((storage) => storage.getItem('btech-authenticated') === 'true')
      authStorage?.setItem('btech-user-name', String(updatedProfile.fullName || '').trim())
      if (profileSetupComplete || updatedProfile.profileCompleted === true) {
        authStorage?.setItem('btech-profile-completed', 'true')
        if (mandatorySetup) navigate('/dashboard', { replace: true })
      }
      window.dispatchEvent(new CustomEvent('btech-profile-updated', { detail: { fullName: updatedProfile.fullName || '' } }))
      setFeedback({ type: 'success', message: mandatorySetup ? 'Profile saved successfully. Your account setup is complete.' : 'Profile updated successfully.' })
      window.setTimeout(() => setFeedback(null), 2000)
    } catch (error) {
      const fieldErrors = Object.entries(error.validationErrors || {}).reduce((result, [field, messages]) => {
        const key = field.charAt(0).toLowerCase() + field.slice(1)
        const message = Array.isArray(messages) ? messages[0] : messages
        if (typeof message === 'string' && key in editForm) result[key] = message
        return result
      }, {})
      if (Object.keys(fieldErrors).length) setErrors((current) => ({ ...current, ...fieldErrors }))
      const firstField = Object.keys(fieldErrors)[0]
      const fieldMessage = firstField && !/\/api\/v\d+|\b(?:GET|POST|PUT|PATCH|DELETE)\b/i.test(fieldErrors[firstField]) ? `${profileFieldLabel(firstField)}: ${fieldErrors[firstField]}` : null
      const message = fieldMessage || (error.status === 401 ? 'Your session has expired. Please sign in again.' : error.status === 400 || error.status === 422 ? 'Please review the highlighted profile details.' : error.status >= 500 ? 'Profile update is temporarily unavailable.' : 'Unable to save your profile. Please try again.')
      setFeedback({ type: 'error', message })
    } finally { setSaving(false) }
  }
  const logout = () => { signOut(); navigate('/login', { replace: true }) }

  if (loading) return <DashboardLayout><main className="profile-page" data-export-record><div className="profile-state"><span className="profile-spinner" /><h2>Loading your profile</h2><p>Please wait while we retrieve your information.</p></div></main></DashboardLayout>
  if (!profile) return <DashboardLayout><main className="profile-page" data-export-record><div className="profile-state error"><section className="profile-error-card" role="alert"><h2>Profile unavailable</h2><p>{feedback?.message || 'Unable to load profile information.'}</p><button type="button" className="profile-button" onClick={loadProfile}>Try Again</button></section></div></main></DashboardLayout>

  return <DashboardLayout><main className="profile-page" data-export-record>
    <header className="profile-heading"><div><p className="profile-eyebrow">{isStudent ? 'Student dashboard' : 'Account'}</p><h1>My Profile</h1><p>{isStudent ? 'View your personal details and current academic information.' : 'Review your saved identity and account information.'}</p></div>{mandatorySetup ? <button type="button" className="profile-button profile-setup-logout" onClick={logout}>Log out</button> : <button type="button" className="profile-button" onClick={openEdit}><FiEdit2 className="module-action-icon module-action-icon--edit" /> Edit Profile</button>}</header>
    {mandatorySetup && <div className="profile-feedback" role="status">Complete your profile setup to continue. Your college, department, role, and permissions remain managed by your administrator.</div>}
    {feedback && <div className={`profile-feedback ${feedback.type}`} role={feedback.type === 'error' ? 'alert' : 'status'}>{feedback.message}</div>}
    <section className="profile-overview"><div className="profile-identity"><div className="profile-avatar" aria-hidden="true">{profile.profileImagePath ? <img src={profilePhotoUrl(profile.profileImagePath)} alt="" /> : initials(profile.fullName)}</div><div><h2 className="profile-name">{display(profile.fullName)}</h2><p className="profile-email">{display(profile.email)}</p><span className="profile-role"><FiShield /> {isStudent ? 'Student' : display(profile.role)}</span></div></div><dl className="profile-facts"><div><dt>{isStudent ? 'Admission Number' : 'Employee ID'}</dt><dd>{display(isStudent ? profile.admissionNumber || profile.identifier : profile.identifier || profile.id)}</dd></div><div><dt>{isStudent ? 'Course / Branch' : 'Last Login'}</dt><dd>{display(isStudent ? [profile.course, profile.branch].filter(Boolean).join(' - ') : formatLastLogin(profile.lastLoginAt))}</dd></div><div><dt>Account Status</dt><dd className="profile-status"><i /> {display(profile.status)}</dd></div></dl></section>
    <section className="profile-preview-section profile-details-card">
      <DetailSection icon={FiUser} title="Personal Information">
        <Detail label="Full Name" value={profile.fullName} />
        <Detail label="Email Address" value={profile.email} />
        <Detail label="Mobile Number" value={profile.mobile} />
        <Detail label="Gender" value={profile.gender} />
        <Detail label="Date of Birth" value={formatDateOnly(profile.dateOfBirth)} />
      </DetailSection>
      <DetailSection icon={FiShield} title={isStudent ? 'Academic Information' : 'Institutional Details'}>
        {isStudent ? <><Detail label="Admission Number" value={profile.admissionNumber || profile.identifier} /><Detail label="Registration Number" value={profile.registrationNumber} /><Detail label="Roll Number" value={profile.rollNumber} /><Detail label="Department" value={profile.department} /><Detail label="Course" value={profile.course || profile.designation} /><Detail label="Branch" value={profile.branch} /><Detail label="Academic Year" value={profile.academicYear || profile.batch} /><Detail label="Semester / Section" value={[profile.semester, profile.section && `Section ${profile.section}`].filter(Boolean).join(' - ')} /></> : <><Detail label="Employee ID" value={profile.identifier || profile.id} /><Detail label="Assigned Role" value={profile.role} /><Detail label="Department" value={profile.department} /><Detail label="Designation / Course" value={profile.designation} /></>}
      </DetailSection>
      <DetailSection icon={FiMapPin} title="Address & Bio">
        <AddressCard title="Current Address" houseNumber={profile.houseNumber} address={profile.address} city={profile.city} district={profile.district} state={profile.state} pincode={profile.pincode || profile.postalCode}/>
        <AddressCard title="Permanent Address" houseNumber={profile.permanentHouseNumber} address={profile.permanentAddress} city={profile.permanentCity} district={profile.permanentDistrict} state={profile.permanentState} pincode={profile.permanentPincode}/>
        <Detail label="About Me" value={profile.bio} wide />
      </DetailSection>
    </section>
    {editOpen && <div className="profile-modal" onMouseDown={(event) => event.target === event.currentTarget && closeEdit()}><section data-no-export className="profile-edit-dialog" role="dialog" aria-modal="true" aria-labelledby="profile-edit-title"><header><div><p className="profile-eyebrow">Account</p><h2 id="profile-edit-title">{mandatorySetup ? 'Complete Your Profile' : 'Edit Profile'}</h2><span>{mandatorySetup ? 'Please complete your profile to continue using the college management system.' : 'Update your personal, institutional, contact, and address information.'}</span></div><button ref={closeButtonRef} hidden={mandatorySetup} type="button" className="profile-modal-close" onClick={closeEdit} aria-label="Close edit profile dialog"><FiX /></button></header><form onSubmit={save} noValidate><fieldset><legend>Personal Information</legend><div className="profile-edit-grid"><label><span>Full Name <b className="profile-required">*</b></span><input name="fullName" value={editForm.fullName} onChange={update} aria-invalid={Boolean(errors.fullName)} />{errors.fullName && <small role="alert">{errors.fullName}</small>}</label><label><span>Email Address <b className="profile-required">*</b></span><input name="email" type="email" value={editForm.email} onChange={update} aria-invalid={Boolean(errors.email)} />{errors.email && <small role="alert">{errors.email}</small>}</label><label><span>Mobile Number <b className="profile-required">*</b></span><input name="mobile" inputMode="numeric" value={editForm.mobile} onChange={update} aria-invalid={Boolean(errors.mobile)} />{errors.mobile && <small role="alert">{errors.mobile}</small>}</label><label>Gender<ProjectSelect name="gender" value={editForm.gender} onChange={update}><option value="">Select gender</option><option>Female</option><option>Male</option><option>Non-binary</option><option>Prefer not to say</option></ProjectSelect></label><label>Date of Birth<input name="dateOfBirth" type="date" value={editForm.dateOfBirth} onChange={update} aria-invalid={Boolean(errors.dateOfBirth)} />{errors.dateOfBirth && <small role="alert">{errors.dateOfBirth}</small>}</label></div></fieldset><fieldset><legend>Assigned Organization</legend><div className="profile-edit-grid"><p className="profile-readonly-note">College: {display(profile.collegeName)} · Role: {display(profile.role)}. College name, role, and identity are system-managed; complete the college details below.</p><label><span>College Type</span><input name="collegeType" value={editForm.collegeType} onChange={update} placeholder="e.g. Engineering" /></label><label><span>University Name</span><input name="universityName" value={editForm.universityName} onChange={update} placeholder="Enter university name" /></label><label><span>College Email</span><input type="email" name="collegeEmail" value={editForm.collegeEmail} onChange={update} placeholder="Enter official email" /></label><label><span>College Mobile</span><input name="collegeMobile" value={editForm.collegeMobile} onChange={update} placeholder="Enter mobile number" /></label><label><span>College Phone</span><input name="collegePhone" value={editForm.collegePhone} onChange={update} placeholder="Enter phone number" /></label><label><span>Website</span><input name="collegeWebsite" value={editForm.collegeWebsite} onChange={update} placeholder="https://" /></label><label className="profile-edit-wide"><span>Address Line 1</span><input name="collegeAddressLine1" value={editForm.collegeAddressLine1} onChange={update} placeholder="College street address" /></label><label className="profile-edit-wide"><span>Address Line 2</span><input name="collegeAddressLine2" value={editForm.collegeAddressLine2} onChange={update} placeholder="Area / landmark (optional)" /></label><label><span>City</span><input name="collegeCity" value={editForm.collegeCity} onChange={update} /></label><label><span>District</span><input name="collegeDistrict" value={editForm.collegeDistrict} onChange={update} /></label><label><span>State</span><input name="collegeState" value={editForm.collegeState} onChange={update} /></label><label><span>Country</span><input name="collegeCountry" value={editForm.collegeCountry} onChange={update} /></label><label><span>PIN Code</span><input name="collegePincode" value={editForm.collegePincode} onChange={update} placeholder="Enter PIN code" /></label><label><span>Department</span><ProjectSelect name="departmentId" value={editForm.departmentId} onChange={update}><option value="">Select department</option>{departments.map((row) => { const id = row.departmentId ?? row.id ?? row.DepartmentId; const name = row.departmentName ?? row.name ?? row.DepartmentName; return <option key={id} value={id}>{name}</option> })}</ProjectSelect></label><label><span>Designation</span><input name="designation" value={editForm.designation} onChange={update} placeholder="Enter designation" /></label></div></fieldset><fieldset><legend>Address &amp; Bio</legend><div className="profile-edit-grid"><div className="profile-address-heading profile-edit-wide">Current Address</div><label><span>House No <b className="profile-required">*</b></span><input name="houseNumber" value={editForm.houseNumber} onChange={update} aria-invalid={Boolean(errors.houseNumber)} placeholder="Enter house number" />{errors.houseNumber && <small role="alert">{errors.houseNumber}</small>}</label><label className="profile-edit-wide"><span>Address <b className="profile-required" aria-hidden="true">*</b></span><textarea name="address" value={editForm.address} onChange={update} placeholder="Enter street, locality and landmark" /></label><label><span>PIN Code <b className="profile-required" aria-hidden="true">*</b></span><input name="pincode" inputMode="numeric" value={editForm.pincode} onChange={update} aria-invalid={Boolean(errors.pincode)} placeholder="Enter 6-digit PIN code" />{errors.pincode && <small role="alert">{errors.pincode}</small>}{pincodeStatus.current && <small className="profile-pin-status">{pincodeStatus.current}</small>}</label><label><span>City / Block <b className="profile-required" aria-hidden="true">*</b></span><input name="city" value={editForm.city} onChange={update} placeholder="Enter city or block" /></label><label><span>District <b className="profile-required" aria-hidden="true">*</b></span><input name="district" value={editForm.district} onChange={update} placeholder="Enter district" /></label><label><span>State <b className="profile-required" aria-hidden="true">*</b></span><input name="state" value={editForm.state} onChange={update} placeholder="Enter state" /></label><div className="profile-address-heading profile-edit-wide">Permanent Address</div><label className="profile-same-address profile-edit-wide"><input type="checkbox" name="sameAsCurrentAddress" checked={editForm.sameAsCurrentAddress} onChange={update} /><span>Same as Current Address</span></label><label><span>House No <b className="profile-required" aria-hidden="true">*</b></span><input name="permanentHouseNumber" value={editForm.permanentHouseNumber} onChange={update} placeholder="Enter permanent house number" /></label><label className="profile-edit-wide"><span>Address <b className="profile-required" aria-hidden="true">*</b></span><textarea name="permanentAddress" value={editForm.permanentAddress} onChange={update} placeholder="Enter permanent address" /></label><label><span>PIN Code <b className="profile-required" aria-hidden="true">*</b></span><input name="permanentPincode" inputMode="numeric" value={editForm.permanentPincode} onChange={update} aria-invalid={Boolean(errors.permanentPincode)} placeholder="Enter 6-digit PIN code" />{errors.permanentPincode && <small role="alert">{errors.permanentPincode}</small>}{pincodeStatus.permanent && <small className="profile-pin-status">{pincodeStatus.permanent}</small>}</label><label><span>City / Block <b className="profile-required" aria-hidden="true">*</b></span><input name="permanentCity" value={editForm.permanentCity} onChange={update} placeholder="Enter city or block" /></label><label><span>District <b className="profile-required" aria-hidden="true">*</b></span><input name="permanentDistrict" value={editForm.permanentDistrict} onChange={update} placeholder="Enter district" /></label><label><span>State <b className="profile-required" aria-hidden="true">*</b></span><input name="permanentState" value={editForm.permanentState} onChange={update} placeholder="Enter state" /></label><label className="profile-edit-wide">About Me<textarea name="bio" value={editForm.bio} onChange={update} placeholder="Tell us about yourself" /></label></div></fieldset><div className="profile-readonly-note"><FiShield /> Employee ID, role, status, last login, and other system-managed details cannot be edited.</div>{feedback?.type === 'error' && <p className="profile-form-error" role="alert">{feedback.message}</p>}<footer><button type="button" className="profile-button secondary" onClick={closeEdit} disabled={saving}>Cancel</button><button type="submit" className="profile-button" disabled={saving}>{saving ? 'Saving...' : 'Save Changes'}</button></footer></form></section></div>}
  </main></DashboardLayout>
}

return { default: MyProfile }
})()

// Settings screen and private helpers.
const SettingsScreen = (() => {
const Navigate = react_router_domImports_Navigate

// Preserve existing bookmarks; workspace selection now lives in the shell.
function Settings() {
  return <GlobalSettings />
}

return { default: Settings }
})()

export const MyProfile = MyProfileScreen.default
export const Settings = SettingsScreen.default
export default MyProfile
