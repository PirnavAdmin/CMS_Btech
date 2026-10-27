import Link from './PermissionLink.jsx'
import { useEffect, useId, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { FiBell, FiChevronDown, FiLogOut, FiLock, FiMoon, FiSun, FiUser } from 'react-icons/fi'
import './FacultyNavbarActions.css'
import FacultyChangePassword from './FacultyChangePassword.jsx'

export default function FacultyNavbarActions({ name, theme, onToggleTheme, onSignOut }) {
  const menu = useRef(null), trigger = useRef(null)
  const notifications = useRef(null), notificationTrigger = useRef(null)
  const notificationId = useId()
  const [notificationsOpen, setNotificationsOpen] = useState(false)
  const [passwordOpen, setPasswordOpen] = useState(false)
  const [updatedName, setUpdatedName] = useState(null)
  const displayName = updatedName ?? name
  useEffect(() => {
    const update = event => { if (event.detail?.fullName) setUpdatedName(event.detail.fullName) }
    window.addEventListener('btech-profile-updated', update)
    return () => window.removeEventListener('btech-profile-updated', update)
  }, [])
  const { pathname } = useLocation()
  useEffect(() => { menu.current?.removeAttribute('open'); setNotificationsOpen(false) }, [pathname])
  useEffect(() => {
    const outside = event => { if (!menu.current?.contains(event.target)) menu.current?.removeAttribute('open'); if (!notifications.current?.contains(event.target)) setNotificationsOpen(false) }
    const escape = event => {
      if (event.key === 'Escape' && notifications.current?.querySelector('[role=region]')) { setNotificationsOpen(false); notificationTrigger.current?.focus() }
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
  return <><div className="faculty-navbar-actions">
    <div className="faculty-notifications" ref={notifications}>
      <button type="button" ref={notificationTrigger} className={`faculty-navbar-icon${notificationsOpen ? ' is-active' : ''}`} aria-label="Notifications" aria-expanded={notificationsOpen} aria-controls={notificationId} title="Notifications" onClick={() => { menu.current?.removeAttribute('open'); setNotificationsOpen(value => !value) }}><FiBell aria-hidden="true" /></button>
      {notificationsOpen && <section id={notificationId} className="faculty-notifications-panel" role="region" aria-label="Faculty notifications"><header><h2>Notifications</h2><button type="button" aria-label="Close notifications" onClick={() => { setNotificationsOpen(false); notificationTrigger.current?.focus() }}>?</button></header><div className="faculty-notifications-empty"><span><FiBell aria-hidden="true" /></span><strong>No updates to display</strong><p>College announcements and updates will appear here when available.</p></div></section>}
    </div>
    <button type="button" className="faculty-navbar-icon" onClick={onToggleTheme} aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`} title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}>{theme === 'dark' ? <FiSun /> : <FiMoon />}</button>
    <details className="account-menu faculty-account-menu" ref={menu} onToggle={event => { if (event.currentTarget.open) setNotificationsOpen(false) }}>
      <summary ref={trigger} aria-label="Open faculty account menu"><span className="account-avatar faculty-account-avatar"><FiUser aria-hidden="true" /></span><span className="faculty-account-identity"><strong title={displayName}>{displayName || 'Faculty'}</strong><small>Teaching Faculty</small></span><FiChevronDown className="faculty-account-chevron" aria-hidden="true" /></summary>
      <div className="account-menu__panel faculty-account-panel"><Link to="/faculty-portal/profile" onClick={close}><FiUser aria-hidden="true" />My Profile</Link><button type="button" onClick={() => { close(); trigger.current?.focus(); setPasswordOpen(true) }}><FiLock aria-hidden="true" />Change Password</button><button type="button" className="faculty-account-signout" onClick={() => { close(); trigger.current?.focus(); onSignOut() }}><FiLogOut aria-hidden="true" />Sign Out</button></div>
    </details>
  </div>{passwordOpen && <FacultyChangePassword onClose={() => setPasswordOpen(false)} />}</>
}
