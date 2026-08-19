import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { signIn } from '../auth/auth'
import { AuthRequestError, login } from '../auth/authApi'
import { validateLogin } from '../auth/loginValidation'
import { ROLES } from '../auth/roles'

const demoRoles = [
  { value: ROLES.ADMIN, label: 'Admin' },
  { value: ROLES.FACULTY, label: 'Faculty' },
  { value: ROLES.STUDENT, label: 'Student' },
]

export default function Login() {
  const navigate = useNavigate()
  const [showPassword, setShowPassword] = useState(false)
  const [rememberMe, setRememberMe] = useState(false)
  const [values, setValues] = useState({ identifier: '', password: '' })
  const [errors, setErrors] = useState({ identifier: '', password: '' })
  const [submitError, setSubmitError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [selectedRole, setSelectedRole] = useState(ROLES.ADMIN)

  const updateValue = ({ target: { name, value } }) => {
    setValues((current) => ({ ...current, [name]: value }))
    setErrors((current) => ({ ...current, [name]: '' }))
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

  return (
    <main className="admin-login">
      <section className="login-intro" aria-label="B.Tech College Management System">
        <div className="login-intro__pattern" aria-hidden="true" />
        <div className="login-intro__content">
          <header className="brand"><span className="brand__mark">B</span><span className="brand__name"><strong>B.Tech College</strong><small>Management System</small></span></header>
          <div className="intro-copy"><p className="eyebrow">Admin Portal</p><h1>Built for better campus operations.</h1><p>Manage your institution with clarity, confidence, and a connected view of what matters.</p></div>
          <p className="copyright">&copy; {new Date().getFullYear()} B.Tech College Management System</p>
        </div>
      </section>
      <section className="login-panel" aria-labelledby="login-title">
        <form className="login-form" onSubmit={handleSubmit} noValidate>
          <header><h2 id="login-title">Welcome back</h2><p>Sign in to continue to the Admin Dashboard.</p></header>
          <fieldset className="role-picker"><legend>Access role</legend><div>{demoRoles.map((role) => <button key={role.value} type="button" className={selectedRole === role.value ? 'active' : ''} onClick={() => setSelectedRole(role.value)} aria-pressed={selectedRole === role.value}>{role.label}</button>)}</div></fieldset>
          <label htmlFor="identifier"><span>Email / Mobile / Employee ID</span><input id="identifier" type="text" name="identifier" value={values.identifier} onChange={updateValue} placeholder="Enter email, mobile number or employee ID" autoComplete="username" aria-invalid={Boolean(errors.identifier)} aria-describedby={errors.identifier ? 'identifier-error' : undefined} /></label>
          {errors.identifier && <p id="identifier-error" className="field-error" role="alert">{errors.identifier}</p>}
          <label htmlFor="password"><span>Password</span><span className="password-input"><input id="password" type={showPassword ? 'text' : 'password'} name="password" value={values.password} onChange={updateValue} placeholder="Enter your password" autoComplete="current-password" aria-invalid={Boolean(errors.password)} aria-describedby={errors.password ? 'password-error' : undefined} /><button type="button" className="password-toggle" onClick={() => setShowPassword((visible) => !visible)} aria-label={showPassword ? 'Hide password' : 'Show password'}>{showPassword ? 'Hide' : 'Show'}</button></span></label>
          {errors.password && <p id="password-error" className="field-error" role="alert">{errors.password}</p>}
          <div className="login-options"><label className="remember-me"><input type="checkbox" checked={rememberMe} onChange={(event) => setRememberMe(event.target.checked)} /><span>Remember me</span></label><a href="mailto:admin@btechcollege.edu?subject=Password%20reset%20request">Forgot Password?</a></div>
          {submitError && <p className="form-error" role="alert">{submitError}</p>}
          <button className="sign-in-button" type="submit" disabled={isSubmitting} aria-busy={isSubmitting}>{isSubmitting ? 'Signing in...' : 'Sign In'}</button>
          <p className="access-note">For authorized college administration use only.</p>
        </form>
      </section>
    </main>
  )
}
