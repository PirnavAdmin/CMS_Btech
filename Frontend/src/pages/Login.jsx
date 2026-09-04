import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { signIn } from '../auth/auth'
import { sendOtp, verifyOtp } from '../auth/authApi'
import { AuthRequestError, login } from '../api/apiEndpoints'
import { validateLogin } from '../auth/loginValidation'
import ForgotPassword from './ForgotPassword'
import ThemeToggle from '../components/ThemeToggle'
import { FiArrowLeft, FiBell, FiBookOpen, FiCalendar, FiFileText, FiX } from 'react-icons/fi'
import campusHero from '../assets/college-campus-hero.png'
import './Login.css'

export default function Login() {
  const navigate = useNavigate()
  const [showPassword, setShowPassword] = useState(false)
  const [rememberMe, setRememberMe] = useState(() => localStorage.getItem('btech-remember-me') === 'true')
  const [values, setValues] = useState(() => ({ identifier: localStorage.getItem('btech-remember-me') === 'true' ? localStorage.getItem('btech-remembered-identifier') || '' : '', password: '' }))
  const [errors, setErrors] = useState({ identifier: '', password: '' })
  const [submitError, setSubmitError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const greeting = new Date().getHours() < 12 ? 'Good morning' : new Date().getHours() < 18 ? 'Good afternoon' : 'Good evening'

  // OTP Flow States: 'login' | 'request_otp' | 'verify_otp' | 'success'
  const [viewMode, setViewMode] = useState('login')
  const [otpContact, setOtpContact] = useState('')
  const [contactError, setContactError] = useState('')
  const [otp, setOtp] = useState('')
  const [otpError, setOtpError] = useState('')
  const [demoOtpHint, setDemoOtpHint] = useState('')
  const [timer, setTimer] = useState(0)
  const [logoutMessage, setLogoutMessage] = useState('')

  useEffect(() => {
    const message = sessionStorage.getItem('btech-logout-message')
    if (!message) return
    setLogoutMessage(message)
    sessionStorage.removeItem('btech-logout-message')
  }, [])

  useEffect(() => {
    if (!logoutMessage) return
    const timeout = setTimeout(() => setLogoutMessage(''), 2000)
    return () => clearTimeout(timeout)
  }, [logoutMessage])

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
      const session = await login({ identifier: values.identifier.trim(), password: values.password, rememberMe })
      localStorage.setItem('btech-remember-me', String(rememberMe))
      if (rememberMe) localStorage.setItem('btech-remembered-identifier', values.identifier.trim())
      else localStorage.removeItem('btech-remembered-identifier')
      signIn(session.roles, session.accessToken, session.refreshToken, rememberMe, session.user)
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
        setDemoOtpHint(`Verification code: ${result.demoOtp}`)
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
    <main className="admin-login pirnav-login">
      <section className="login-intro pirnav-login__campus" aria-label="Pirnav Engineering College digital campus">
        <img className="pirnav-login__campus-image" src={campusHero} alt="Pirnav Engineering College campus" />
        <div className="pirnav-login__campus-shade" />
        <div className="login-intro__pattern" aria-hidden="true" />
        <div className="login-intro__content">
          <header className="brand">
            <span className="brand__mark"><FiBookOpen /></span>
            <span className="brand__name">
              <strong>Pirnav Engineering College</strong>
              <small>Digital Campus Management Portal</small>
            </span>
          </header>
          <div className="intro-copy">
            <p className="eyebrow">Connected Academic Experience</p>
            <h1>Welcome to Pirnav Engineering College</h1>
            <p>A connected digital campus for academics, communication, examinations and college services.</p>
            <div className="pirnav-campus-cards">
              <article><FiCalendar /><span><small>Academic Calendar</small><strong>Semester I · 2026–27 Active</strong></span></article>
              <article><FiBell /><span><small>Campus Announcements</small><strong>Academic updates available</strong></span></article>
              <article><FiFileText /><span><small>Examinations</small><strong>Schedules and services online</strong></span></article>
            </div>
          </div>
          <p className="copyright">Pirnav Engineering College <span>•</span> College Management System</p>
        </div>
      </section>

      <section className="login-panel" aria-label="College account login">
        <div className="login-public-actions">
          <ThemeToggle />
          <Link className="login-home-link" to="/" aria-label="Return to home"><FiArrowLeft aria-hidden="true" /> Home</Link>
        </div>
        {viewMode === 'login' && (
          <form className="login-form" onSubmit={handleSubmit} noValidate>
            <header>
              <h2 className="pirnav-greeting">{greeting}</h2>
              <p>Access your Digital Campus using your registered credentials.</p>
            </header>
            {logoutMessage && <div className="logout-success" role="status"><span>{logoutMessage}</span><button type="button" onClick={() => setLogoutMessage('')} aria-label="Dismiss signed out message"><FiX aria-hidden="true" /></button></div>}
            <label htmlFor="identifier">
              <span>Email, Mobile Number or User ID</span>
              <input
                id="identifier"
                type="text"
                name="identifier"
                value={values.identifier}
                onChange={updateValue}
                placeholder="Enter your registered email, mobile number or user ID"
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
                  title={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? (
                    <svg viewBox="0 0 24 24" aria-hidden="true">
                      <path d="m3 3 18 18" />
                      <path d="M10.6 10.6a2 2 0 0 0 2.8 2.8" />
                      <path d="M9.9 4.2A10.9 10.9 0 0 1 12 4c5.1 0 8.5 4.2 9.5 7.1a1.9 1.9 0 0 1 0 1.3 15.5 15.5 0 0 1-2.1 3.7" />
                      <path d="M6.2 6.2A15.3 15.3 0 0 0 2.5 11.1a1.9 1.9 0 0 0 0 1.3C3.5 15.3 6.9 19.5 12 19.5c1.1 0 2.2-.2 3.2-.6" />
                    </svg>
                  ) : (
                    <svg viewBox="0 0 24 24" aria-hidden="true">
                      <path d="M2.5 12s3.4-7.5 9.5-7.5S21.5 12 21.5 12 18.1 19.5 12 19.5 2.5 12 2.5 12Z" />
                      <circle cx="12" cy="12" r="2.7" />
                    </svg>
                  )}
                </button>
              </span>
            </label>
            {errors.password && <p id="password-error" className="field-error" role="alert">{errors.password}</p>}

            <div className="login-options">
              <label className="remember-me">
                <input type="checkbox" checked={rememberMe} onChange={(event) => { const checked = event.target.checked; setRememberMe(checked); localStorage.setItem('btech-remember-me', String(checked)); if (!checked) localStorage.removeItem('btech-remembered-identifier') }} />
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
            <p className="access-note">© {new Date().getFullYear()} Pirnav Engineering College. All rights reserved.</p>
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
