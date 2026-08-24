import { useState } from 'react'
import { Link } from 'react-router-dom'
import { AuthRequestError, register } from '../auth/authApi'
import { validateRegistration } from '../auth/registrationValidation'

const initialValues = { fullName: '', email: '', mobile: '', password: '', confirmPassword: '', terms: false }

export default function Register() {
  const [values, setValues] = useState(initialValues)
  const [errors, setErrors] = useState({})
  const [submitError, setSubmitError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isComplete, setIsComplete] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  const updateValue = ({ target: { name, value, checked, type } }) => {
    setValues((current) => ({ ...current, [name]: type === 'checkbox' ? checked : value }))
    setErrors((current) => ({ ...current, [name]: '' }))
    setSubmitError('')
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    if (isSubmitting) return

    const nextErrors = validateRegistration(values)
    setErrors(nextErrors)
    if (Object.values(nextErrors).some(Boolean)) return

    setIsSubmitting(true)
    setSubmitError('')
    try {
      await register({
        fullName: values.fullName.trim(),
        email: values.email.trim(),
        mobile: values.mobile.trim(),
        password: values.password,
      })
      setIsComplete(true)
    } catch (error) {
      setSubmitError(error instanceof AuthRequestError ? error.message : 'Unable to submit your request right now. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <main className="admin-login register-page">
      <section className="login-intro" aria-label="Pirnav Engineering College Management System">
        <div className="login-intro__pattern" aria-hidden="true" />
        <div className="login-intro__content">
          <header className="brand"><span className="brand__mark">P</span><span className="brand__name"><strong>Pirnav Engineering College</strong><small>College Management System</small></span></header>
          <div className="intro-copy"><p className="eyebrow">Access request</p><h1>Built for better campus operations.</h1><p>Manage your institution with clarity, confidence, and a connected view of what matters.</p></div>
          <p className="copyright">&copy; {new Date().getFullYear()} Pirnav Engineering College</p>
        </div>
      </section>
      <section className="login-panel" aria-labelledby="register-title">
        {isComplete ? (
          <div className="login-form registration-success">
            <header><h2 id="register-title">Request submitted</h2><p>Registration request submitted successfully.</p></header>
            <p>Your account is currently pending administrator approval. You will be able to sign in once your account has been approved.</p>
            <Link className="sign-in-button success-link" to="/login">Return to Sign In</Link>
          </div>
        ) : (
          <form className="login-form register-form" onSubmit={handleSubmit} noValidate>
            <header><h2 id="register-title">Create your account</h2><p>Request access to Pirnav Engineering College.</p></header>
            <label htmlFor="fullName"><span>Full Name</span><input id="fullName" name="fullName" type="text" value={values.fullName} onChange={updateValue} placeholder="Enter your full name" autoComplete="name" aria-invalid={Boolean(errors.fullName)} aria-describedby={errors.fullName ? 'fullName-error' : undefined} /></label>
            {errors.fullName && <p id="fullName-error" className="field-error" role="alert">{errors.fullName}</p>}
            <label htmlFor="email"><span>Email</span><input id="email" name="email" type="email" value={values.email} onChange={updateValue} placeholder="Enter your email address" autoComplete="email" aria-invalid={Boolean(errors.email)} aria-describedby={errors.email ? 'email-error' : undefined} /></label>
            {errors.email && <p id="email-error" className="field-error" role="alert">{errors.email}</p>}
            <label htmlFor="mobile"><span>Mobile Number</span><input id="mobile" name="mobile" type="tel" value={values.mobile} onChange={updateValue} placeholder="Enter your mobile number" autoComplete="tel" inputMode="numeric" maxLength="10" aria-invalid={Boolean(errors.mobile)} aria-describedby={errors.mobile ? 'mobile-error' : undefined} /></label>
            {errors.mobile && <p id="mobile-error" className="field-error" role="alert">{errors.mobile}</p>}
            <label htmlFor="register-password"><span>Password</span><span className="password-input"><input id="register-password" name="password" type={showPassword ? 'text' : 'password'} value={values.password} onChange={updateValue} placeholder="Create a password" autoComplete="new-password" aria-invalid={Boolean(errors.password)} aria-describedby={errors.password ? 'password-error' : undefined} /><button className="password-toggle" type="button" onClick={() => setShowPassword((visible) => !visible)} aria-label={showPassword ? 'Hide password' : 'Show password'}>{showPassword ? 'Hide' : 'Show'}</button></span></label>
            {errors.password && <p id="password-error" className="field-error" role="alert">{errors.password}</p>}
            <label htmlFor="confirmPassword"><span>Confirm Password</span><span className="password-input"><input id="confirmPassword" name="confirmPassword" type={showConfirmPassword ? 'text' : 'password'} value={values.confirmPassword} onChange={updateValue} placeholder="Confirm your password" autoComplete="new-password" aria-invalid={Boolean(errors.confirmPassword)} aria-describedby={errors.confirmPassword ? 'confirmPassword-error' : undefined} /><button className="password-toggle" type="button" onClick={() => setShowConfirmPassword((visible) => !visible)} aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}>{showConfirmPassword ? 'Hide' : 'Show'}</button></span></label>
            {errors.confirmPassword && <p id="confirmPassword-error" className="field-error" role="alert">{errors.confirmPassword}</p>}
            <label className="terms-option"><input name="terms" type="checkbox" checked={values.terms} onChange={updateValue} aria-invalid={Boolean(errors.terms)} aria-describedby={errors.terms ? 'terms-error' : undefined} /><span>I agree to the Terms &amp; Conditions</span></label>
            {errors.terms && <p id="terms-error" className="field-error" role="alert">{errors.terms}</p>}
            {submitError && <p className="form-error" role="alert">{submitError}</p>}
            <button className="sign-in-button" type="submit" disabled={isSubmitting} aria-busy={isSubmitting}>{isSubmitting ? 'Submitting...' : 'Submit Registration Request'}</button>
            <p className="account-link">Already have an account? <Link to="/login">Sign in</Link></p>
          </form>
        )}
      </section>
    </main>
  )
}
