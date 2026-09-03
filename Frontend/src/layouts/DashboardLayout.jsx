import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { FiLock, FiLogOut, FiMenu, FiMoon, FiSearch, FiSun, FiUser } from 'react-icons/fi'
import { getUserRole, signOut } from '../auth/auth'
import { changePassword } from '../api/apiEndpoints'
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
  const { pathname } = useLocation()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => localStorage.getItem('pirnav-sidebar-collapsed') === 'true')
  const [globalQuery, setGlobalQuery] = useState('')
  const [theme, setTheme] = useState(() => localStorage.getItem('pirnav-theme') || (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'))

  const userRole = getUserRole() || 'user'
  const roleLabel = userRole.charAt(0).toUpperCase() + userRole.slice(1)
  const pageName = ({
    '/dashboard': 'Dashboard', '/my-profile': 'My Profile', '/settings': 'Settings',
    '/college-institution-management': 'College', '/academic-year-management': 'Academic Years',
    '/department-management': 'Departments', '/semester-management': 'Semesters', '/section-management': 'Sections',
    '/student-management/admissions': 'Student Admissions',
    '/student-management/profiles': 'Student Profiles', '/student-management/promotions': 'Student Promotions',
  })[pathname] || (pathname.startsWith('/student-management/admissions') ? 'Student Admissions' : pathname.startsWith('/courses') ? 'Courses' : pathname.startsWith('/branches') ? 'Branches' : 'Digital Campus')
  const breadcrumbSection = ['My Profile', 'Settings'].includes(pageName) ? 'Account' : pageName === 'Dashboard' ? 'Digital Campus' : pageName.startsWith('Student ') ? 'Student Management' : 'Academic Configuration'

  // Logout confirmation state
  const [showLogoutConfirmation, setShowLogoutConfirmation] = useState(false)
  const accountMenuRef = useRef(null)

  // Change password state
  const [open, setOpen] = useState(false)
  const [values, setValues] = useState(empty)
  const [errors, setErrors] = useState({})
  const [visible, setVisible] = useState({})
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)

  const triggerRef = useRef(null)
  const closeRef = useRef(null)

  useEffect(() => {
    document.documentElement.dataset.theme = theme
    localStorage.setItem('pirnav-theme', theme)
  }, [theme])

  const globalLinks = [['Dashboard', '/dashboard'], ['Student Admissions', '/student-management/admissions'], ['Student Profiles', '/student-management/profiles'], ['Student Promotions', '/student-management/promotions'], ['College', '/college-institution-management'], ['Academic Years', '/academic-year-management'], ['Courses', '/courses'], ['Departments', '/department-management'], ['Branches', '/branches'], ['Semesters', '/semester-management'], ['Sections', '/section-management'], ['My Profile', '/my-profile'], ['Settings', '/settings']]
  const globalResults = globalQuery.trim() ? globalLinks.filter(([label]) => label.toLowerCase().includes(globalQuery.trim().toLowerCase())) : []
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
  // Logout Actions
  // -------------------------
  const requestSignOut = () => {
    accountMenuRef.current?.removeAttribute('open')
    setShowLogoutConfirmation(true)
  }

  const handleSignOut = () => {
    signOut()
    sessionStorage.setItem('btech-logout-message', 'You have been signed out successfully.')
    navigate('/login', { replace: true })
  }

  // -------------------------
  // Change Password Actions
  // -------------------------
  const validate = (data = values) => {
    const next = {}

    if (!data.currentPassword) {
      next.currentPassword = 'Current password is required.'
    }

    if (!data.newPassword) {
      next.newPassword = 'New password is required.'
    } else if (!requirements(data.newPassword).every((item) => item[1])) {
      next.newPassword = 'Use all password requirements.'
    } else if (data.newPassword === data.currentPassword) {
      next.newPassword = 'New password must be different from current password.'
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
    if (!open && !showLogoutConfirmation) return undefined

    if (open) closeRef.current?.focus()

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        if (open) closeModal()
        if (showLogoutConfirmation) setShowLogoutConfirmation(false)
      }
    }

    window.addEventListener('keydown', handleKeyDown)

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [open, showLogoutConfirmation, submitting])

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
    setErrors({})
    try {
      await changePassword({
        currentPassword: values.currentPassword,
        newPassword: values.newPassword,
        confirmNewPassword: values.confirmPassword,
      })
      setValues(empty)
      setSuccess(true)
    } catch (error) {
      setErrors({ currentPassword: error.message || 'Unable to change password. Please try again.' })
      setSuccess(false)
    } finally {
      setSubmitting(false)
    }
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
            name === 'currentPassword' ? 'current-password' : 'new-password'
          }
          aria-invalid={Boolean(errors[name])}
          aria-describedby={errors[name] ? `${name}-error` : undefined}
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
    <div className={`dashboard-layout ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} collapsed={sidebarCollapsed} onToggleCollapse={() => setSidebarCollapsed(value => { const next = !value; localStorage.setItem('pirnav-sidebar-collapsed', String(next)); return next })} />

      <main>
        <header className="dashboard-header">
          <div className="dashboard-header__context"><button className="mobile-menu-button" onClick={() => setSidebarOpen(true)} aria-label="Open navigation"><FiMenu /></button></div>

          <div className="global-search"><FiSearch aria-hidden="true" /><input aria-label="Search modules" value={globalQuery} onChange={(event) => setGlobalQuery(event.target.value)} placeholder="Search" />{globalResults.length > 0 && <div className="global-search-results">{globalResults.map(([label, to]) => <Link to={to} key={to} onClick={() => setGlobalQuery('')}>{label}</Link>)}</div>}</div>

          <div className="dashboard-header__actions">
          <button className="theme-toggle" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`} title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}>{theme === 'dark' ? <FiSun /> : <FiMoon />}</button>

          <details className="account-menu" ref={accountMenuRef}>
            <summary aria-label="Open account menu">
              <span className="account-avatar">
                <FiUser aria-hidden="true" />
              </span>

              <span>
                <strong>{roleLabel}</strong>
                <small>Account</small>
              </span>

              <i className="account-menu__chevron" aria-hidden="true" />
            </summary>

            <div className="account-menu__panel">
              <button type="button" onClick={() => navigate('/my-profile')}>
                <FiUser aria-hidden="true" />
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
                <FiLock aria-hidden="true" />
                Change Password
              </button>

              <button
                type="button"
                className="account-menu__signout"
                onClick={requestSignOut}
              >
                <FiLogOut aria-hidden="true" />
                Sign Out
              </button>
            </div>
          </details>
          </div>
        </header>

        <section className="page-content">{!['Student Promotions', 'Student Profiles'].includes(pageName) && <nav className="app-breadcrumb" aria-label="Breadcrumb"><span>{breadcrumbSection}</span><span aria-hidden="true">/</span><strong>{pageName}</strong></nav>}{children}</section>

        {/* Logout Confirmation Modal */}
        {showLogoutConfirmation && (
          <div
            className="logout-confirmation-backdrop"
            onMouseDown={(event) => {
              if (event.target === event.currentTarget) {
                setShowLogoutConfirmation(false)
              }
            }}
          >
            <section
              className="logout-confirmation"
              role="dialog"
              aria-modal="true"
              aria-labelledby="logout-confirmation-title"
              aria-describedby="logout-confirmation-description"
            >
              <div className="logout-confirmation__icon" aria-hidden="true">
                <FiLogOut aria-hidden="true" />
              </div>

              <p className="logout-confirmation__eyebrow">Account access</p>
              <h2 id="logout-confirmation-title">Sign out of your account?</h2>
              <p id="logout-confirmation-description">
                You’ll need to sign in again to access your dashboard.
              </p>

              <div className="logout-confirmation__actions">
                <button
                  type="button"
                  className="logout-confirmation__cancel"
                  onClick={() => setShowLogoutConfirmation(false)}
                >
                  Stay signed in
                </button>

                <button
                  type="button"
                  className="logout-confirmation__confirm"
                  onClick={handleSignOut}
                >
                  Sign out
                </button>
              </div>
            </section>
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
                  <div>Your password has been changed successfully.</div>
                  <button
                    className="password-modal__primary"
                    onClick={closeModal}
                  >
                    Done
                  </button>
                </div>
              ) : (
                <>
                  <p className="password-modal__eyebrow">Security Settings</p>
                  <h2 id="password-modal-title">Change Password</h2>
                  <p className="password-modal__subtitle">
                    Keep your account secure by creating a strong new password.
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
                          <li className={item[1] ? 'met' : ''} key={item[0]}>
                            <b>{item[1] ? '✓' : '○'}</b> {item[0]}
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
                        type="submit"
                        className="password-modal__primary"
                        disabled={submitting || Object.keys(validate()).length > 0}
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
