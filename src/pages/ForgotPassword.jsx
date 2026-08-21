import { useEffect, useRef, useState } from 'react'
import { AuthRequestError, sendOtp, verifyOtp, resetPassword } from '../auth/authApi'
import './ForgotPassword.css'

const isValidContact = (value, method) => method === 'email'
  ? /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
  : /^[6-9]\d{9}$/.test(value)

export default function ForgotPassword({ onBack }) {
  const [method, setMethod] = useState('email')
  const [contact, setContact] = useState('')
  const [otp, setOtp] = useState('')
  const [step, setStep] = useState('contact')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [demoOtp, setDemoOtp] = useState('')
  const [timer, setTimer] = useState(0)
  const [passwords, setPasswords] = useState({ password: '', confirmPassword: '' })
  const otpRefs = useRef([])

  useEffect(() => {
    if (!timer) return undefined
    const interval = window.setInterval(() => setTimer((value) => value - 1), 1000)
    return () => window.clearInterval(interval)
  }, [timer])

  const requestOtp = async (event) => {
    event?.preventDefault()
    const cleanContact = contact.trim()
    if (!cleanContact) {
      setError(method === 'email' ? 'Please enter your email ID.' : 'Please enter your mobile number.')
      return
    }
    if (!isValidContact(cleanContact, method)) {
      setError(method === 'email' ? 'Please enter a valid email ID.' : 'Please enter a valid 10-digit Indian mobile number starting with 6, 7, 8, or 9.')
      return
    }
    setLoading(true)
    setError('')
    try {
      const result = await sendOtp({ contact: cleanContact })
      setDemoOtp(result.demoOtp || '')
      setStep('otp')
      setTimer(60)
    } catch (requestError) {
      setError(requestError instanceof AuthRequestError ? requestError.message : 'Unable to send the verification code.')
    } finally {
      setLoading(false)
    }
  }

  const validateOtp = async (event) => {
    event.preventDefault()
    if (!/^\d{6}$/.test(otp)) return setError('Please enter a valid 6-digit OTP code.')
    setLoading(true)
    setError('')
    try {
      await verifyOtp({ contact: contact.trim(), otp })
      setStep('change-password')
    } catch (verificationError) {
      setError(verificationError instanceof AuthRequestError ? verificationError.message : 'Unable to verify the OTP.')
    } finally {
      setLoading(false)
    }
  }

  const changePassword = async (event) => {
    event.preventDefault()
    const newPassword = passwords.password.trim()
    const confirmed = passwords.confirmPassword.trim()

    if (!newPassword || !confirmed) {
      setError('Please fill in both password fields.')
      return
    }
    if (newPassword.length < 8) {
      setError('Password must contain at least 8 characters.')
      return
    }
    if (newPassword !== confirmed) {
      setError('Passwords do not match.')
      return
    }

    setLoading(true)
    setError('')
    try {
      await resetPassword({ contact: contact.trim(), otp, password: newPassword })
      setStep('success')
    } catch (resetError) {
      setError(resetError instanceof AuthRequestError ? resetError.message : 'Unable to reset your password right now. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const updateOtp = (index, value) => {
    const digit = value.replace(/\D/g, '').slice(-1)
    setOtp((current) => `${current.padEnd(6, ' ').slice(0, index)}${digit || ' '}${current.padEnd(6, ' ').slice(index + 1)}`.trimEnd())
    setError('')
    if (digit && index < 5) otpRefs.current[index + 1]?.focus()
  }

  if (step === 'success') return <div className="login-form recovery-success" role="status"><header><h2>Password changed</h2><p>Your password has been updated successfully. You can now sign in with your new password.</p></header><button className="sign-in-button" type="button" onClick={onBack}>Back to Sign In</button></div>

  if (step === 'change-password') return (
    <form className="login-form" onSubmit={changePassword} noValidate>
      <header><h2>Change password</h2><p>Create a new password for your account.</p></header>
      <label className="recovery-password" htmlFor="new-password"><span>New password</span><input id="new-password" type="password" autoComplete="new-password" value={passwords.password} onChange={(event) => { setPasswords((current) => ({ ...current, password: event.target.value })); setError('') }} /></label>
      <label className="recovery-password" htmlFor="confirm-password"><span>Confirm new password</span><input id="confirm-password" type="password" autoComplete="new-password" value={passwords.confirmPassword} onChange={(event) => { setPasswords((current) => ({ ...current, confirmPassword: event.target.value })); setError('') }} /></label>
      {error && <p className="form-error" role="alert">{error}</p>}
      <button className="sign-in-button" type="submit" disabled={loading}>{loading ? 'Updating...' : 'Change Password'}</button>
      <button type="button" className="text-button back-to-login" onClick={onBack}>Cancel</button>
    </form>
  )

  if (step === 'otp') return (
    <form className="login-form" onSubmit={validateOtp} noValidate>
      <header><h2>OTP verification</h2><p>Enter the 6-digit code sent to <strong>{contact.trim()}</strong>.</p>{demoOtp && <p className="demo-otp">Demo OTP: {demoOtp}</p>}</header>
      <fieldset className="otp-fieldset compact-otp-fieldset"><legend>Verification code</legend><div className="otp-boxes compact-otp-boxes" onPaste={(event) => { const pasted = event.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6); if (pasted) { event.preventDefault(); setOtp(pasted); otpRefs.current[Math.min(pasted.length, 6) - 1]?.focus() } }}>{Array.from({ length: 6 }, (_, index) => <input key={index} ref={(element) => { otpRefs.current[index] = element }} type="text" inputMode="numeric" autoComplete={index === 0 ? 'one-time-code' : 'off'} maxLength={1} value={otp[index] || ''} onChange={(event) => updateOtp(index, event.target.value)} onKeyDown={(event) => { if (event.key === 'Backspace' && !otp[index] && index > 0) otpRefs.current[index - 1]?.focus() }} aria-label={`OTP digit ${index + 1}`} aria-invalid={Boolean(error)} />)}</div></fieldset>
      {error && <p className="form-error" role="alert">{error}</p>}
      <button className="sign-in-button" type="submit" disabled={loading}>{loading ? 'Verifying...' : 'Verify OTP'}</button>
      <div className="recovery-actions clean-recovery-actions">{timer > 0 ? <span className="resend-countdown">Resend OTP in {timer}s</span> : <button type="button" className="text-button resend-button" disabled={loading} onClick={requestOtp}>Resend OTP</button>}<button type="button" className="text-button" onClick={() => { setStep('contact'); setOtp(''); setError('') }}>Change contact</button><button type="button" className="text-button" onClick={onBack}>Cancel</button></div>
    </form>
  )

  const switchMethod = (nextMethod) => { setMethod(nextMethod); setContact(''); setError('') }
  return (
    <form className="login-form" onSubmit={requestOtp} noValidate>
      <header><h2>Forgot your password?</h2><p>Choose where you would like to receive your verification code.</p></header>
      <div className="recovery-tabs verification-method-tabs" role="tablist" aria-label="Verification method"><button type="button" role="tab" aria-selected={method === 'email'} className={method === 'email' ? 'active' : ''} onClick={() => switchMethod('email')}>Email</button><button type="button" role="tab" aria-selected={method === 'mobile'} className={method === 'mobile' ? 'active' : ''} onClick={() => switchMethod('mobile')}>Mobile</button></div>
      <label htmlFor="recovery-contact"><span>{method === 'email' ? 'Email ID' : 'Mobile number'}</span><input id="recovery-contact" type="text" inputMode={method === 'email' ? 'email' : 'numeric'} autoComplete={method === 'email' ? 'email' : 'tel'} maxLength={method === 'mobile' ? 10 : undefined} placeholder={method === 'email' ? 'Enter email ID' : 'Enter mobile number'} value={contact} onChange={(event) => { setContact(method === 'mobile' ? event.target.value.replace(/\D/g, '') : event.target.value); setError('') }} aria-invalid={Boolean(error)} /></label>
      {error && <p className="form-error" role="alert">{error}</p>}
      <button className="sign-in-button" type="submit" disabled={loading}>{loading ? 'Sending...' : 'Send Verification Code'}</button>
      <button type="button" className="text-button back-to-login" onClick={onBack}>← Back to Sign In</button>
    </form>
  )
}
