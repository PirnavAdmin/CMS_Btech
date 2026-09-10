import { showSuccess, showWarning } from '../utils/toast'
import useToastState from '../hooks/useToastState'
import { useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { AuthRequestError, register } from '../auth/authApi'
import { passwordRequirements, validateRegistration } from '../auth/registrationValidation'
import { FiBell, FiBookOpen, FiCalendar, FiEye, FiEyeOff, FiFileText } from 'react-icons/fi'
import ThemeToggle from '../components/ThemeToggle'
import campusHero from '../assets/college-campus-hero.png'

const initialValues = { fullName: '', email: '', mobile: '', password: '', confirmPassword: '', terms: false }

export default function Register() {
  const submitLock = useRef(false)
  const formRef = useRef(null)
  const [values, setValues] = useState(initialValues)
  const [errors, setErrors] = useToastState({}, 'error')
  const [submitError, setSubmitError] = useToastState('', 'error')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isComplete, setIsComplete] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  const updateValue = ({ target: { name, value, checked, type } }) => {
    if (submitLock.current) return
    const nextValues = { ...values, [name]: type === 'checkbox' ? checked : value }
    setValues(nextValues)
    setErrors((current) => ({
      ...current,
      [name]: '',
      ...(['password', 'confirmPassword'].includes(name) ? {
        confirmPassword: nextValues.confirmPassword && nextValues.password !== nextValues.confirmPassword
          ? 'Passwords do not match.' : '',
      } : {}),
    }))
    setSubmitError('')
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    if (submitLock.current) return

    const nextErrors = validateRegistration(values)
    setErrors(nextErrors)
    if (Object.values(nextErrors).some(Boolean)) {
      showWarning('Correct the highlighted fields before submitting.')
      requestAnimationFrame(() => formRef.current?.querySelector('[aria-invalid="true"]')?.focus())
      return
    }
    submitLock.current = true

    setIsSubmitting(true)
    setSubmitError('')
    try {
      await register({
        fullName: values.fullName.trim(),
        email: values.email.trim(),
        mobile: values.mobile.trim(),
        password: values.password,
        confirmPassword: values.confirmPassword,
        agreeToTerms: values.terms,
      })
      setValues(initialValues)
      setIsComplete(true); showSuccess('Access request submitted successfully.')
    } catch (error) {
      setSubmitError(error instanceof AuthRequestError ? error.message : 'Unable to submit your request right now. Please try again.')
    } finally {
      submitLock.current = false
      setIsSubmitting(false)
    }
  }

  return (
    <main className="admin-login register-page">
      <section className="login-intro register-brand-panel" aria-label="Pirnav Engineering College digital campus">
        <img className="register-brand-panel__image" src={campusHero} alt="Pirnav Engineering College campus" />
        <div className="register-brand-panel__shade" />
        <div className="login-intro__pattern" aria-hidden="true" />
        <div className="login-intro__content">
          <header className="brand"><span className="brand__mark"><FiBookOpen /></span><span className="brand__name"><strong>Pirnav Engineering College</strong><small>Digital Campus Management Portal</small></span></header>
          <div className="intro-copy"><p className="eyebrow">Connected Academic Experience</p><h1>Welcome to Pirnav Engineering College</h1><p>A connected digital campus for academics, communication, examinations and college services.</p><div className="pirnav-campus-cards"><article><FiCalendar /><span><small>Academic Calendar</small><strong>Semester I · 2026–27 Active</strong></span></article><article><FiBell /><span><small>Campus Announcements</small><strong>Academic updates available</strong></span></article><article><FiFileText /><span><small>Examinations</small><strong>Schedules and services online</strong></span></article></div></div>
          <p className="copyright">Pirnav Engineering College <span>•</span> College Management System</p>
        </div>
      </section>
      <section className="login-panel" aria-labelledby="register-title"><div className="register-public-actions"><Link to="/">Home</Link><ThemeToggle /></div>
        {isComplete ? (
          <div className="login-form registration-success" role="status">
            <header><h2 id="register-title">Request submitted</h2><p>Your access request has been submitted successfully.</p></header>
            <p>Please contact the college administration for the status of your access request.</p>
            <Link className="sign-in-button success-link" to="/login">Return to Sign In</Link>
          </div>
        ) : (
          <form ref={formRef} className="login-form register-form" onSubmit={handleSubmit} noValidate aria-busy={isSubmitting}>
            <header><h2 id="register-title">Request campus access</h2><p>Request access to Pirnav Engineering College.</p></header>
            <label htmlFor="fullName"><span>Full Name</span><input id="fullName" name="fullName" type="text" value={values.fullName} onChange={updateValue} placeholder="Enter your full name" autoComplete="name" aria-invalid={Boolean(errors.fullName)} aria-describedby={errors.fullName ? 'fullName-error' : undefined} /></label>
            {errors.fullName && <p id="fullName-error" className="field-error" role="alert">{errors.fullName}</p>}
            <label htmlFor="email"><span>Email</span><input id="email" name="email" type="email" value={values.email} onChange={updateValue} placeholder="Enter your email address" autoComplete="email" aria-invalid={Boolean(errors.email)} aria-describedby={errors.email ? 'email-error' : undefined} /></label>
            {errors.email && <p id="email-error" className="field-error" role="alert">{errors.email}</p>}
            <label htmlFor="mobile"><span>Mobile Number</span><input id="mobile" name="mobile" type="tel" value={values.mobile} onChange={updateValue} placeholder="Enter your mobile number" autoComplete="tel" inputMode="numeric" maxLength="10" aria-invalid={Boolean(errors.mobile)} aria-describedby={errors.mobile ? 'mobile-error' : undefined} /></label>
            {errors.mobile && <p id="mobile-error" className="field-error" role="alert">{errors.mobile}</p>}
            <label htmlFor="register-password"><span>Password</span><span className="password-input"><input id="register-password" name="password" type={showPassword ? 'text' : 'password'} value={values.password} onChange={updateValue} placeholder="Create a password" autoComplete="new-password" aria-invalid={Boolean(errors.password)} aria-describedby={`password-requirements${errors.password ? ' password-error' : ''}`} /><button className="password-toggle" type="button" onClick={() => setShowPassword((visible) => !visible)} aria-label={showPassword ? 'Hide password' : 'Show password'} title={showPassword ? 'Hide password' : 'Show password'}>{showPassword ? <FiEyeOff aria-hidden="true" /> : <FiEye aria-hidden="true" />}</button></span></label>
            {errors.password && <p id="password-error" className="field-error" role="alert">{errors.password}</p>}
            <ul aria-live="polite" id="password-requirements" className="password-requirements" aria-label="Password requirements">
              {passwordRequirements.map(rule => <li key={rule.label} className={rule.test(values.password) ? 'met' : 'unmet'}><span aria-hidden="true">{rule.test(values.password) ? '✓' : '○'}</span><span>{rule.label}<span className="sr-only">{rule.test(values.password) ? ': met' : ': not met'}</span></span></li>)}
            </ul>
            <label htmlFor="confirmPassword"><span>Confirm Password</span><span className="password-input"><input id="confirmPassword" name="confirmPassword" type={showConfirmPassword ? 'text' : 'password'} value={values.confirmPassword} onChange={updateValue} placeholder="Confirm your password" autoComplete="new-password" aria-invalid={Boolean(errors.confirmPassword)} aria-describedby={errors.confirmPassword ? 'confirmPassword-error' : undefined} /><button className="password-toggle" type="button" onClick={() => setShowConfirmPassword((visible) => !visible)} aria-label={showConfirmPassword ? 'Hide password' : 'Show password'} title={showConfirmPassword ? 'Hide password' : 'Show password'}>{showConfirmPassword ? <FiEyeOff aria-hidden="true" /> : <FiEye aria-hidden="true" />}</button></span></label>
            {errors.confirmPassword && <p id="confirmPassword-error" className="field-error" role="alert">{errors.confirmPassword}</p>}
            <label className="terms-option"><input name="terms" type="checkbox" checked={values.terms} onChange={updateValue} aria-invalid={Boolean(errors.terms)} aria-describedby={errors.terms ? 'terms-error' : undefined} /><span>I agree to the Terms &amp; Conditions</span></label>
            {errors.terms && <p id="terms-error" className="field-error" role="alert">{errors.terms}</p>}
            {submitError && <p className="form-error" role="alert">{submitError}</p>}
            <button className="sign-in-button" type="submit" disabled={isSubmitting} aria-busy={isSubmitting}>{isSubmitting ? 'Submitting...' : 'Submit Access Request'}</button>
            <p className="account-link">Already have an account? <Link to="/login">Sign in</Link></p>
          </form>
        )}
      </section>
    </main>
  )
}
