import { useId, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { FiCheck, FiEye, FiEyeOff, FiLock } from 'react-icons/fi'
import { changePassword } from '../../api/apiEndpoints.js'
import { signOut } from '../../auth/auth.js'
import { PortalDialog } from './PortalUI.jsx'
import { passwordRequirements, validateFacultyPassword } from './facultyPasswordValidation.js'
import './FacultyChangePassword.css'

export default function FacultyChangePassword({ onClose }) {
  const id = useId(), navigate = useNavigate(), formRef = useRef(null)
  const [values, setValues] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' })
  const [visible, setVisible] = useState({}), [errors, setErrors] = useState({}), [serverError, setServerError] = useState(''), [busy, setBusy] = useState(false)
  const rules = passwordRequirements(values.newPassword), met = rules.filter(([, valid]) => valid).length
  const strength = !values.newPassword ? 'Not entered' : met === 5 ? 'Strong' : met >= 3 ? 'Medium' : 'Weak'
  const close = () => { if (!busy) onClose() }
  const submit = async event => {
    event.preventDefault()
    if (busy) return
    const validation = validateFacultyPassword(values)
    setErrors(validation); setServerError('')
    const first = Object.keys(validation)[0]
    if (first) { formRef.current?.elements.namedItem(first)?.focus(); return }
    setBusy(true)
    try {
      await changePassword({ currentPassword: values.currentPassword, newPassword: values.newPassword, confirmNewPassword: values.confirmPassword })
      setValues({ currentPassword: '', newPassword: '', confirmPassword: '' })
      signOut()
      sessionStorage.setItem('btech-logout-message', 'Password changed successfully. Please sign in with your new password.')
      navigate('/login', { replace: true })
    } catch (error) { setServerError(error.message || 'Unable to change password. Please try again.') }
    finally { setBusy(false) }
  }
  const field = (name, label, placeholder) => <div className="faculty-password-field"><label htmlFor={`${id}-${name}`}>{label}</label><div className={`faculty-password-input${errors[name] ? ' is-invalid' : ''}`}><FiLock aria-hidden="true" /><input id={`${id}-${name}`} name={name} required disabled={busy} autoComplete={name === 'currentPassword' ? 'current-password' : 'new-password'} type={visible[name] ? 'text' : 'password'} value={values[name]} placeholder={placeholder} aria-invalid={!!errors[name]} aria-describedby={errors[name] ? `${id}-${name}-error` : undefined} onChange={event => { setValues({ ...values, [name]: event.target.value }); setErrors(previous => ({ ...previous, [name]: undefined })); setServerError('') }} /><button type="button" disabled={busy} aria-label={`${visible[name] ? 'Hide' : 'Show'} ${label.toLowerCase()}`} aria-pressed={!!visible[name]} onClick={() => setVisible({ ...visible, [name]: !visible[name] })}>{visible[name] ? <FiEyeOff /> : <FiEye />}</button></div>{errors[name] && <small id={`${id}-${name}-error`} role="alert">{errors[name]}</small>}</div>
  return <PortalDialog title="Change Password" onClose={close}><div className="faculty-password-content"><p>Keep your account secure by creating a strong new password.</p>{serverError && <p className="faculty-password-error" role="alert">{serverError}</p>}<form ref={formRef} onSubmit={submit} noValidate aria-busy={busy}>{field('currentPassword', 'Current Password', 'Enter current password')}{field('newPassword', 'New Password', 'Create a new password')}<div className="faculty-password-strength"><div><span>Password Strength</span><strong>{strength}</strong></div><progress aria-label="Password strength" max={5} value={values.newPassword ? met : 0} /><ul>{rules.map(([label, valid]) => <li key={label} className={valid ? 'is-met' : ''}><FiCheck aria-hidden="true" />{label}</li>)}</ul></div>{field('confirmPassword', 'Confirm New Password', 'Confirm the new password')}<p className="faculty-password-hint">After updating your password, sign in again with your new password.</p><div className="portal-actions"><button type="button" disabled={busy} onClick={close}>Cancel</button><button className="primary" type="submit" disabled={busy}>{busy ? 'Updating Password...' : 'Update Password'}</button></div></form></div></PortalDialog>
}
