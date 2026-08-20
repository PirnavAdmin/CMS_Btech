import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { signIn } from '../auth/auth'
import { AuthRequestError, login, sendOtp, verifyOtp } from '../auth/authApi'
import { validateLogin } from '../auth/loginValidation'
import { ROLES } from '../auth/roles'
import ForgotPassword from './ForgotPassword'

export default function Login() {
  const navigate = useNavigate()
  const [showPassword, setShowPassword] = useState(false)
  const [rememberMe, setRememberMe] = useState(false)
  const [values, setValues] = useState({ identifier: '', password: '' })
  const [errors, setErrors] = useState({ identifier: '', password: '' })
  const [submitError, setSubmitError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const selectedRole = ROLES.ADMIN

  // OTP Flow States: 'login' | 'request_otp' | 'verify_otp' | 'success'
  const [viewMode, setViewMode] = useState('login')
  const [otpContact, setOtpContact] = useState('')
  const [contactError, setContactError] = useState('')
  const [otp, setOtp] = useState('')
  const [otpError, setOtpError] = useState('')
  const [demoOtpHint, setDemoOtpHint] = useState('')
  const [timer, setTimer] = useState(0)

  useEffect(() => {
    let interval = null
    if (timer > 0) {
      interval = setInterval(() => setTimer((t) => t - 1), 1000)
    }
    return () => clearInterval(interval)
  }, [timer])

  const validateContact = (input) => {
    const value = input.trim()
    if (!value) {
      return 'Please enter your email or mobile number.'
    }
    if (/^\d+$/.test(value)) {
      if (value.length !== 10) {
        return 'Mobile number must be exactly 10 digits.'
      }
      return ''
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(value)) {
      return 'Please enter a valid email address or 10-digit mobile number.'
    }

    return ''
  }

  const updateValue = ({ target: { name, value } }) => {
    setValues((current) => ({ ...current, [name]: value }))
    setErrors((current) => ({ ...current, [name]: '' }))
    setSubmitError('')
  }

  const resetOtpFlow = () => {
    setViewMode('login')
    setOtpContact('')
    setContactError('')
    setOtp('')
    setOtpError('')
    setDemoOtpHint('')
    setSubmitError('')
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    if (isSubmitting) return

    const nextErrors = validateLogin(values)
    setErrors(nextErrors)
    if (nextErrors.identifier || nextErrors.password) return

    setIsSubmitting(true)
    setSubmitError('')
    try {
      const session = await login({ identifier: values.identifier.trim(), password: values.password }, selectedRole)
      signIn(session.user.role)
      navigate('/dashboard')
    } catch (error) {
      setSubmitError(error instanceof AuthRequestError ? error.message : 'Unable to sign in right now. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleSendCode = async (e) => {
    e.preventDefault()
    setOtpError('')

    const validationMsg = validateContact(otpContact)
    if (validationMsg) {
      setContactError(validationMsg)
      return
    }

    setIsSubmitting(true)
    try {
      const result = await sendOtp({ contact: otpContact.trim() })
      if (result.demoOtp) {
        setDemoOtpHint(`(Demo OTP: ${result.demoOtp})`)
      }
      setViewMode('verify_otp')
      setTimer(60)
    } catch (error) {
      setOtpError(error instanceof AuthRequestError ? error.message : 'Failed to send verification code. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleVerifyOtp = async (e) => {
    e.preventDefault()
    setOtpError('')

    if (!otp || !/^\d{6}$/.test(otp)) {
      setOtpError('Please enter a valid 6-digit OTP code.')
      return
    }

    setIsSubmitting(true)
    try {
      await verifyOtp({ contact: otpContact.trim(), otp })
      setViewMode('success')
    } catch (error) {
      setOtpError(error instanceof AuthRequestError ? error.message : 'OTP verification failed. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <main className="admin-login">
      <section className="login-intro" aria-label="B.Tech College Management System">
        <div className="login-intro__pattern" aria-hidden="true" />
        <div className="login-intro__content">
          <header className="brand">
            <span className="brand__mark">B</span>
            <span className="brand__name">
              <strong>B.Tech College</strong>
              <small>Management System</small>
            </span>
          </header>
          <div className="intro-copy">
            <p className="eyebrow">Admin Portal</p>
            <h1>Built for better campus operations.</h1>
            <p>Manage your institution with clarity, confidence, and a connected view of what matters.</p>
          </div>
          <p className="copyright">&copy; {new Date().getFullYear()} B.Tech College Management System</p>
        </div>
      </section>

      <section className="login-panel" aria-labelledby="login-title">
        {viewMode === 'login' && (
          <form className="login-form" onSubmit={handleSubmit} noValidate>
            <header>
              <h2 id="login-title">Welcome back</h2>
              <p>Sign in to continue to the Admin Dashboard.</p>
            </header>
            <label htmlFor="identifier">
              <span>Email / Mobile / Employee ID</span>
              <input
                id="identifier"
                type="text"
                name="identifier"
                value={values.identifier}
                onChange={updateValue}
                placeholder="Enter email, mobile number or employee ID"
                autoComplete="username"
                aria-invalid={Boolean(errors.identifier)}
                aria-describedby={errors.identifier ? 'identifier-error' : undefined}
              />
            </label>
            {errors.identifier && <p id="identifier-error" className="field-error" role="alert">{errors.identifier}</p>}

            <label htmlFor="password">
              <span>Password</span>
              <span className="password-input">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  value={values.password}
                  onChange={updateValue}
                  placeholder="Enter your password"
                  autoComplete="current-password"
                  aria-invalid={Boolean(errors.password)}
                  aria-describedby={errors.password ? 'password-error' : undefined}
                />
                <button
                  type="button"
                  className="password-toggle"
                  onClick={() => setShowPassword((visible) => !visible)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? 'Hide' : 'Show'}
                </button>
              </span>
            </label>
            {errors.password && <p id="password-error" className="field-error" role="alert">{errors.password}</p>}

            <div className="login-options">
              <label className="remember-me">
                <input type="checkbox" checked={rememberMe} onChange={(event) => setRememberMe(event.target.checked)} />
                <span>Remember me</span>
              </label>
              <button
                type="button"
                className="forgot-password-link"
                onClick={() => setViewMode('forgot-password')}
                style={{ background: 'none', border: 'none', color: 'inherit', font: 'inherit', cursor: 'pointer', padding: 0, textDecoration: 'underline' }}
              >
                Forgot Password?
              </button>
            </div>

            {submitError && <p className="form-error" role="alert">{submitError}</p>}
            <button className="sign-in-button" type="submit" disabled={isSubmitting} aria-busy={isSubmitting}>
              {isSubmitting ? 'Signing in...' : 'Sign In'}
            </button>
            <p className="account-link">Don&apos;t have an account? <Link to="/register">Request access</Link></p>
            <p className="access-note">For authorized college administration use only.</p>
          </form>
        )}

        {viewMode === 'forgot-password' && <ForgotPassword onBack={resetOtpFlow} />}

        {/* FORGOT PASSWORD - REQUEST OTP */}
        {viewMode === 'request_otp' && (
          <form className="login-form" onSubmit={handleSendCode} noValidate>
            <header>
              <h2>Forgot Password</h2>
              <p>Enter your Email or 10-digit Mobile number to receive a verification code.</p>
            </header>

            <label htmlFor="otp-contact">
              <span>Email / Mobile Number</span>
              <input
                id="otp-contact"
                type="text"
                value={otpContact}
                onChange={(e) => {
                  setOtpContact(e.target.value)
                  setContactError('')
                }}
                placeholder="Enter email or 10-digit mobile number"
              />
            </label>
            {contactError && <p className="field-error" role="alert">{contactError}</p>}
            {otpError && <p className="form-error" role="alert">{otpError}</p>}

            <button className="sign-in-button" type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Sending Code...' : 'Send Verification Code'}
            </button>

            <button
              type="button"
              className="forgot-password-link"
              onClick={resetOtpFlow}
              style={{ marginTop: '12px', background: 'none', border: 'none', color: 'inherit', font: 'inherit', cursor: 'pointer' }}
            >
              &larr; Back to Sign In
            </button>
          </form>
        )}

        {viewMode === 'verify_otp' && (
          <form className="login-form" onSubmit={handleVerifyOtp} noValidate>
            <header>
              <h2>OTP Verification</h2>
              <p>Enter the 6-digit code sent to <strong>{otpContact}</strong></p>
              {demoOtpHint && <p style={{ color: '#2563eb', fontSize: '0.85rem', fontWeight: 600, marginTop: '4px' }}>{demoOtpHint}</p>}
            </header>

            <label htmlFor="otp-code">
              <span>Enter 6-Digit OTP</span>
              <input
                id="otp-code"
                type="text"
                maxLength={6}
                value={otp}
                onChange={(e) => {
                  setOtp(e.target.value.replace(/\D/g, ''))
                  setOtpError('')
                }}
                placeholder="e.g. 529691"
                style={{ letterSpacing: '4px', fontSize: '1.1rem', textAlign: 'center' }}
              />
            </label>
            {otpError && <p className="form-error" role="alert">{otpError}</p>}

            <button className="sign-in-button" type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Verifying...' : 'Verify OTP'}
            </button>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '12px' }}>
              <button
                type="button"
                disabled={timer > 0 || isSubmitting}
                onClick={handleSendCode}
                style={{ background: 'none', border: 'none', color: timer > 0 ? '#9ca3af' : '#2563eb', cursor: timer > 0 ? 'not-allowed' : 'pointer', fontSize: '0.9rem' }}
              >
                {timer > 0 ? `Resend OTP in ${timer}s` : 'Resend OTP'}
              </button>
              <button
                type="button"
                onClick={resetOtpFlow}
                style={{ background: 'none', border: 'none', color: 'inherit', font: 'inherit', cursor: 'pointer', fontSize: '0.9rem' }}
              >
                Cancel
              </button>
            </div>
          </form>
        )}

        {viewMode === 'success' && (
          <div className="login-form" style={{ textAlign: 'center' }}>
            <header>
              <h2>Verification Complete</h2>
              <p style={{ color: '#16a34a', margin: '20px 0', fontSize: '1.1rem', fontWeight: 600 }}>
                Verified successfully
              </p>
            </header>
            <button className="sign-in-button" type="button" onClick={resetOtpFlow}>
              Back to Sign In
            </button>
          </div>
        )}
      </section>
    </main>
  )
}
