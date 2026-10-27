import { useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { changePassword } from '../../api/apiEndpoints.js'
import { isAuthenticated, mustChangePassword, signOut } from '../../auth/auth.js'
import './FirstLoginPassword.css'

export default function FirstLoginPassword() {
  const navigate = useNavigate()
  const [form, setForm] = useState({ currentPassword: '', newPassword: '', confirmNewPassword: '' })
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  if (!isAuthenticated()) return <Navigate to="/login" replace />
  if (!mustChangePassword()) return <Navigate to="/dashboard" replace />
  const leave = () => { signOut(); navigate('/login', { replace: true }) }
  const submit = async event => {
    event.preventDefault()
    if (saving) return
    setError('')
    if (form.newPassword.length < 8) return setError('Use at least 8 characters for your new password.')
    if (form.currentPassword === form.newPassword) return setError('Choose a password different from your temporary password.')
    if (form.newPassword !== form.confirmNewPassword) return setError('New passwords do not match.')
    setSaving(true)
    try {
      await changePassword(form)
      signOut()
      sessionStorage.setItem('btech-logout-message', 'Password changed. Sign in with your new password.')
      navigate('/login', { replace: true })
    } catch (reason) {
      setError(reason.message || 'Unable to change password. Please try again.')
    } finally { setSaving(false) }
  }
  return <main className="first-login-password"><section aria-labelledby="first-password-title">
    <h1 id="first-password-title">Set your new password</h1>
    <p>Change your temporary password before opening your account.</p>
    <form onSubmit={submit}>
      {[
        ['currentPassword', 'Temporary password', 'current-password'],
        ['newPassword', 'New password', 'new-password'],
        ['confirmNewPassword', 'Confirm new password', 'new-password'],
      ].map(([key, label, autoComplete]) => <label key={key} htmlFor={`first-${key}`}>
        <span>{label}</span><input id={`first-${key}`} name={key} type="password" autoComplete={autoComplete}
          value={form[key]} required minLength={key === 'currentPassword' ? undefined : 8}
          disabled={saving} onChange={event => setForm(current => ({ ...current, [key]: event.target.value }))} />
      </label>)}
      <small>Use at least 8 characters. Your new password must differ from the temporary password.</small>
      {error && <p role="alert">{error}</p>}
      <button type="submit" disabled={saving}>{saving ? 'Saving...' : 'Change password'}</button>
      <button type="button" onClick={leave} disabled={saving}>Sign out</button>
    </form>
  </section></main>
}
