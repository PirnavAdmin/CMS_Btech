import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getUserRole, signOut } from '../auth/auth'
import Sidebar from '../components/Sidebar'
import './DashboardLayout.css'
import './AccountMenu.css'

const empty = {
  currentPassword: '',
  newPassword: '',
  confirmPassword: '',
}

const requirements = (password) => [
  ['At least 8 characters', password.length >= 8],
  ['One uppercase letter', /[A-Z]/.test(password)],
  ['One lowercase letter', /[a-z]/.test(password)],
  ['One number', /\d/.test(password)],
  ['One special character', /[^A-Za-z0-9]/.test(password)],
]

export default function DashboardLayout({ children }) {
  const navigate = useNavigate()

  const userRole = getUserRole() || 'user'
  const roleLabel =
    userRole.charAt(0).toUpperCase() + userRole.slice(1)

  // Logout confirmation
  const [showLogoutConfirmation, setShowLogoutConfirmation] = useState(false)
  const accountMenuRef = useRef(null)

  // Change password
  const [open, setOpen] = useState(false)
  const [values, setValues] = useState(empty)
  const [errors, setErrors] = useState({})
  const [visible, setVisible] = useState({})
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)
  const [mockPassword, setMockPassword] = useState('Admin@123')

  const triggerRef = useRef(null)
  const closeRef = useRef(null)

  const rules = useMemo(
    () => requirements(values.newPassword),
    [values.newPassword]
  )

  const met = rules.filter((item) => item[1]).length

  const strength = !values.newPassword
    ? 'Not set'
    : met <= 2
      ? 'Weak'
      : met === 3
        ? 'Fair'
        : met === 4
          ? 'Good'
          : 'Strong'

  // -------------------------
  // Logout
  // -------------------------

  const requestSignOut = () => {
    accountMenuRef.current?.removeAttribute('open')
    setShowLogoutConfirmation(true)
  }

  const handleSignOut = () => {
    signOut()
    sessionStorage.setItem(
      'btech-logout-message',
      'Successfully signed out.'
    )
    navigate('/login', { replace: true })
  }

  // -------------------------
  // Change Password
  // -------------------------

  const validate = (data = values) => {
    const next = {}

    if (!data.currentPassword) {
      next.currentPassword = 'Current password is required.'
    } else if (data.currentPassword !== mockPassword) {
      next.currentPassword = 'Current password is incorrect.'
    }

    if (!data.newPassword) {
      next.newPassword = 'New password is required.'
    } else if (
      !requirements(data.newPassword).every((item) => item[1])
    ) {
      next.newPassword = 'Use all password requirements.'
    } else if (data.newPassword === data.currentPassword) {
      next.newPassword =
        'New password must be different from your current password.'
    }

    if (!data.confirmPassword) {
      next.confirmPassword = 'Confirm your new password.'
    } else if (data.confirmPassword !== data.newPassword) {
      next.confirmPassword = 'Passwords do not match.'
    }

    return next
  }

  const closeModal = () => {
    if (submitting) return

    setOpen(false)
    setValues(empty)
    setErrors({})
    setVisible({})
    setSuccess(false)

    setTimeout(() => {
      triggerRef.current?.focus()
    }, 0)
  }

  useEffect(() => {
    if (!open) return undefined

    closeRef.current?.focus()

    const escape = (event) => {
      if (event.key === 'Escape') {
        closeModal()
      }
    }

    window.addEventListener('keydown', escape)

    return () => {
      window.removeEventListener('keydown', escape)
    }
  }, [open, submitting])

  const update = (event) => {
    const next = {
      ...values,
      [event.target.name]: event.target.value,
    }

    setValues(next)
    setErrors(validate(next))
  }

  const submit = async (event) => {
    event.preventDefault()

    const next = validate()
    setErrors(next)

    if (Object.keys(next).length) return

    setSubmitting(true)

    // Temporary static implementation.
    // Replace this with the backend Change Password API later.
    await new Promise((resolve) => setTimeout(resolve, 650))

    setMockPassword(values.newPassword)
    setSubmitting(false)
    setSuccess(true)
  }

  const field = (name, label, placeholder) => (
    <label className="password-modal__field">
      <span>{label}</span>

      <div>
        <input
          id={name}
          name={name}
          type={visible[name] ? 'text' : 'password'}
          value={values[name]}
          onChange={update}
          placeholder={placeholder}
          autoComplete={
            name === 'currentPassword'
              ? 'current-password'
              : 'new-password'
          }
          aria-invalid={Boolean(errors[name])}
          aria-describedby={
            errors[name] ? `${name}-error` : undefined
          }
        />

        <button
          type="button"
          onClick={() =>
            setVisible((current) => ({
              ...current,
              [name]: !current[name],
            }))
          }
          aria-label={`${visible[name] ? 'Hide' : 'Show'} ${label}`}
        >
          {visible[name] ? 'Hide' : 'Show'}
        </button>
      </div>

      {errors[name] && (
        <small id={`${name}-error`} role="alert">
          {errors[name]}
        </small>
      )}
    </label>
  )

  return (
    <div className="dashboard-layout">
      <Sidebar />

      <main>
        <header className="dashboard-header">
          <span>BTech Management System</span>

          <details
            className="account-menu"
            ref={accountMenuRef}
          >
            <summary aria-label="Open account menu">
              <span className="account-avatar">
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <circle cx="12" cy="8" r="3.5" />
                  <path d="M5.5 20c.6-4.1 2.8-6.2 6.5-6.2s5.9 2.1 6.5 6.2" />
                </svg>
              </span>

              <span>
                <strong>{roleLabel}</strong>
                <small>Account</small>
              </span>

              <i
                className="account-menu__chevron"
                aria-hidden="true"
              />
            </summary>

            <div className="account-menu__panel">
              <button
                type="button"
                onClick={() => navigate('/my-profile')}
              >
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <circle cx="12" cy="8" r="3.5" />
                  <path d="M5.5 20c.7-4.1 2.9-6.2 6.5-6.2s5.8 2.1 6.5 6.2" />
                </svg>
                My Profile
              </button>

              <button
                ref={triggerRef}
                type="button"
                onClick={(event) => {
                  event.currentTarget
                    .closest('details')
                    ?.removeAttribute('open')

                  setOpen(true)
                }}
              >
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <rect x="5" y="10" width="14" height="10" rx="2" />
                  <path d="M8 10V7a4 4 0 0 1 8 0v3M12 14v2.5" />
                </svg>
                Change Password
              </button>

              <button
                type="button"
                className="account-menu__signout"
                onClick={requestSignOut}
              >
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M10 5H5.5A1.5 1.5 0 0 0 4 6.5v11A1.5 1.5 0 0 0 5.5 19H10" />
                  <path d="M14 8l4 4-4 4M8 12h10" />
                </svg>
                Sign Out
              </button>
            </div>
          </details>
        </header>

        <section className="page-content">
          {children}
        </section>

        {/* Logout Confirmation */}
        {showLogoutConfirmation && (
          <div
            className="logout-confirmation"
            role="dialog"
            aria-modal="true"
            aria-labelledby="logout-confirmation-title"
          >
            <p className="logout-confirmation__eyebrow">
              Sign out
            </p>

            <h2 id="logout-confirmation-title">
              Ready to leave?
            </h2>

            <p>
              Your session will be cleared securely and you will
              need to sign in again.
            </p>

            <div className="logout-confirmation__actions">
              <button
                type="button"
                className="logout-confirmation__cancel"
                onClick={() =>
                  setShowLogoutConfirmation(false)
                }
              >
                Cancel
              </button>

              <button
                type="button"
                className="logout-confirmation__confirm"
                onClick={handleSignOut}
              >
                Sign Out
              </button>
            </div>
          </div>
        )}

        {/* Change Password Modal */}
        {open && (
          <div
            className="password-modal-backdrop"
            onMouseDown={(event) => {
              if (event.target === event.currentTarget) {
                closeModal()
              }
            }}
          >
            <section
              className="password-modal"
              role="dialog"
              aria-modal="true"
              aria-labelledby="password-modal-title"
            >
              <button
                ref={closeRef}
                className="password-modal__close"
                onClick={closeModal}
                disabled={submitting}
                aria-label="Close change password dialog"
              >
                ×
              </button>

              {success ? (
                <div className="password-modal__success">
                  <span aria-hidden="true">✓</span>

                  <p>Security Settings</p>

                  <h2>Password Updated</h2>

                  <div>
                    Your password has been changed successfully.
                  </div>

                  <button
                    className="password-modal__primary"
                    onClick={closeModal}
                  >
                    Done
                  </button>
                </div>
              ) : (
                <>
                  <p className="password-modal__eyebrow">
                    Security Settings
                  </p>

                  <h2 id="password-modal-title">
                    Change Password
                  </h2>

                  <p className="password-modal__subtitle">
                    Keep your account secure by creating a strong
                    new password.
                  </p>

                  <form onSubmit={submit} noValidate>
                    {field(
                      'currentPassword',
                      'Current Password',
                      'Enter current password'
                    )}

                    {field(
                      'newPassword',
                      'New Password',
                      'Create a new password'
                    )}

                    <div className="password-modal__strength">
                      <div>
                        <span>Password Strength</span>
                        <strong>{strength}</strong>
                      </div>

                      <i className={`level-${met}`} />

                      <ul>
                        {rules.map((item) => (
                          <li
                            className={item[1] ? 'met' : ''}
                            key={item[0]}
                          >
                            <b>
                              {item[1] ? '✓' : '○'}
                            </b>{' '}
                            {item[0]}
                          </li>
                        ))}
                      </ul>
                    </div>

                    {field(
                      'confirmPassword',
                      'Confirm New Password',
                      'Confirm the new password'
                    )}

                    <footer>
                      <button
                        type="button"
                        onClick={closeModal}
                        disabled={submitting}
                      >
                        Cancel
                      </button>

                      <button
                        className="password-modal__primary"
                        disabled={
                          submitting ||
                          Object.keys(validate()).length > 0
                        }
                      >
                        {submitting
                          ? 'Updating Password...'
                          : 'Update Password'}
                      </button>
                    </footer>
                  </form>
                </>
              )}
            </section>
          </div>
        )}
      </main>
    </div>
  )
}
