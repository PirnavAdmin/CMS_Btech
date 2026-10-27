import { useEffect, useRef, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { FiBell, FiCheck, FiChevronDown, FiLogOut, FiLock, FiMoon, FiSun, FiUser } from 'react-icons/fi'
import './FacultyNavbarActions.css'
import { PortalDialog } from './PortalUI.jsx'
import { facultyService } from '../../features/faculty/services/facultyService.js'

export default function FacultyNavbarActions({ name, theme, onToggleTheme, onSignOut }) {
  const menu = useRef(null), trigger = useRef(null)
  const [passwordOpen, setPasswordOpen] = useState(false), [notificationsOpen, setNotificationsOpen] = useState(false)
  const [notifications, setNotifications] = useState([]), [notificationError, setNotificationError] = useState('')
  const [notificationsLoading, setNotificationsLoading] = useState(true)
  const [password, setPassword] = useState({ currentPassword: '', newPassword: '', confirmation: '' })
  const [passwordError, setPasswordError] = useState(''), [passwordNotice, setPasswordNotice] = useState('')
  const [updatedName, setUpdatedName] = useState(null)
  const displayName = updatedName ?? name
  useEffect(() => {
    const update = event => { if (event.detail?.fullName) setUpdatedName(event.detail.fullName) }
    window.addEventListener('btech-profile-updated', update)
    return () => window.removeEventListener('btech-profile-updated', update)
  }, [])
  const { pathname } = useLocation()
  useEffect(() => { menu.current?.removeAttribute('open') }, [pathname])
  useEffect(() => {
    let active = true
    facultyService.getNotifications()
      .then(rows => {
        if (active) {
          setNotifications(rows)
          setNotificationError('')
        }
      })
      .catch(reason => { if (active) setNotificationError(reason instanceof Error ? reason.message : String(reason)) })
      .finally(() => { if (active) setNotificationsLoading(false) })
    return () => { active = false }
  }, [pathname])
  useEffect(() => {
    const outside = event => { if (!menu.current?.contains(event.target)) menu.current?.removeAttribute('open') }
    const escape = event => {
      if (event.key === 'Escape' && menu.current?.open) {
        menu.current.removeAttribute('open')
        trigger.current?.focus()
      }
    }
    document.addEventListener('pointerdown', outside)
    document.addEventListener('keydown', escape)
    return () => { document.removeEventListener('pointerdown', outside); document.removeEventListener('keydown', escape) }
  }, [])
  const close = () => menu.current?.removeAttribute('open')
  const markRead = async id => {
    try {
      await facultyService.markNotificationRead(id)
      setNotifications(rows => rows.map(row => row.id === id ? { ...row, read: true } : row))
      setNotificationError('')
    } catch (reason) {
      setNotificationError(reason instanceof Error ? reason.message : String(reason))
    }
  }
  const markAllRead = async () => {
    try {
      await facultyService.markAllNotificationsRead()
      setNotifications(rows => rows.map(row => ({ ...row, read: true })))
      setNotificationError('')
    } catch (reason) {
      setNotificationError(reason instanceof Error ? reason.message : String(reason))
    }
  }
  const retryNotifications = async () => {
    setNotificationsLoading(true)
    setNotificationError('')
    try {
      setNotifications(await facultyService.getNotifications())
    } catch (reason) {
      setNotificationError(reason instanceof Error ? reason.message : String(reason))
    } finally {
      setNotificationsLoading(false)
    }
  }
  const unread = notifications.filter(row => !row.read).length
  const notificationContent = notificationsLoading
    ? <p role="status">Loading notifications...</p>
    : notifications.length > 0
      ? notifications.slice(0, 4).map(row => (
        <article key={row.id} className={!row.read ? 'is-unread' : ''}>
          <div><strong>{row.title}</strong><small>{row.timestamp}</small></div>
          {!row.read && <button type="button" aria-label={`Mark ${row.title} read`} onClick={() => markRead(row.id)}><FiCheck /></button>}
        </article>
      ))
      : <p>No notifications to show.</p>
  const submitPassword = async event => {
    event.preventDefault()
    setPasswordError('')
    setPasswordNotice('')
    if (password.newPassword !== password.confirmation) {
      setPasswordError('New password and confirmation must match.')
      return
    }
    try {
      await facultyService.changePassword(password)
      setPasswordNotice('Password change recorded in the local preview.')
      setPassword({ currentPassword: '', newPassword: '', confirmation: '' })
    } catch (reason) {
      setPasswordError(reason instanceof Error ? reason.message : String(reason))
    }
  }
  return <><div className="faculty-navbar-actions">
    <div className="faculty-notification-menu">
      <button type="button" className={`faculty-navbar-icon${notificationsOpen || pathname === '/faculty-portal/notifications' ? ' is-active' : ''}`} onClick={() => setNotificationsOpen(value => !value)} aria-label={`Notifications${unread ? `, ${unread} unread` : ''}`} aria-expanded={notificationsOpen} title="Notifications"><FiBell aria-hidden="true" />{unread > 0 && <span className="faculty-notification-count">{unread > 9 ? '9+' : unread}</span>}</button>
      {notificationsOpen && <section className="faculty-notification-panel" aria-label="Recent notifications"><header><strong>Notifications</strong><button type="button" onClick={markAllRead} disabled={!unread}>Mark all read</button></header>{notificationError && <p role="alert">{notificationError} <button type="button" onClick={retryNotifications}>Retry</button></p>}{notificationContent}<Link to="/faculty-portal/notifications" onClick={() => setNotificationsOpen(false)}>View all notifications</Link></section>}
    </div>
    <button type="button" className="faculty-navbar-icon" onClick={onToggleTheme} aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`} title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}>{theme === 'dark' ? <FiSun /> : <FiMoon />}</button>
    <details className="faculty-account-menu" ref={menu}>
      <summary ref={trigger} aria-label="Open faculty account menu"><span className="faculty-account-avatar"><FiUser aria-hidden="true" /></span><span className="faculty-account-identity"><strong title={displayName}>{displayName || 'Faculty'}</strong><small>Teaching Faculty</small></span><FiChevronDown className="faculty-account-chevron" aria-hidden="true" /></summary>
      <div className="faculty-account-panel"><div className="faculty-account-panel-heading"><strong>{displayName || 'Faculty'}</strong><small>Teaching Faculty</small></div><Link to="/faculty-portal/profile" onClick={close}><FiUser aria-hidden="true" />My Profile</Link><button type="button" onClick={() => { close(); trigger.current?.focus(); setPasswordError(''); setPasswordNotice(''); setPasswordOpen(true) }}><FiLock aria-hidden="true" />Change Password</button><button type="button" className="faculty-account-signout" onClick={() => { close(); trigger.current?.focus(); onSignOut() }}><FiLogOut aria-hidden="true" />Sign Out</button></div>
    </details>
  </div>{passwordOpen && <PortalDialog title="Change password" onClose={() => setPasswordOpen(false)}><form className="faculty-password-preview" onSubmit={submitPassword}><p>Password actions are simulated locally in this frontend preview.</p>{passwordError && <p role="alert">{passwordError}</p>}{passwordNotice && <p role="status">{passwordNotice}</p>}{[['currentPassword', 'Current password'], ['newPassword', 'New password'], ['confirmation', 'Confirm new password']].map(([key, label]) => <label key={key}>{label}<input required type="password" minLength={key === 'currentPassword' ? undefined : 8} value={password[key]} onChange={event => setPassword(current => ({ ...current, [key]: event.target.value }))} /></label>)}<div className="portal-actions"><button type="button" onClick={() => setPasswordOpen(false)}>Close</button><button className="primary">Save password</button></div></form></PortalDialog>}</>
}
