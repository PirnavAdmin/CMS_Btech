import { useEffect, useState } from 'react'
import { Link, Navigate, useParams } from 'react-router-dom'
import PortalLayout from '../../layouts/PortalLayout.jsx'
import { profileApi } from '../../api/apiEndpoints.js'
import { getAuthStorage } from '../../auth/auth.js'
import { Status } from '../../components/portals/PortalUI.jsx'

export default function StaffPortal() {
  const { screen = 'dashboard' } = useParams()
  const [profile, setProfile] = useState(null), [error, setError] = useState(''), [attempt, setAttempt] = useState(0)
  useEffect(() => {
    let active = true
    profileApi.getProfile().then(value => { if (active) setProfile(value) }).catch(reason => { if (active) setError(reason.message || 'Unable to load your account.') })
    return () => { active = false }
  }, [attempt])
  if (!['dashboard', 'profile'].includes(screen)) return <Navigate to="/staff-portal/dashboard" replace />
  const storage = getAuthStorage()
  let roles = []
  try { roles = JSON.parse(storage?.getItem('btech-assigned-roles') || '[]') } catch { /* Older sessions use their profile role. */ }
  const roleLabel = roles.join(', ').replaceAll('_', ' ') || profile?.role || 'Staff'
  const name = profile?.fullName || storage?.getItem('btech-user-name') || 'Staff member'
  const fields = [['Name', name], ['Assigned role', roleLabel], ['Employee ID', profile?.identifier || storage?.getItem('btech-user-employee-id')], ['Email', profile?.email || storage?.getItem('btech-user-email')], ['Mobile', profile?.mobile || storage?.getItem('btech-user-mobile')], ['Department', profile?.department]]
  return <PortalLayout title={screen === 'profile' ? 'My Profile' : 'Dashboard'}><main className="portal-page"><header className="portal-page-heading"><div><p className="portal-eyebrow">Staff workspace</p><h1>{screen === 'profile' ? 'My Profile' : `Welcome, ${name}`}</h1><p>{roleLabel}</p></div></header>
    {error ? <section className="portal-card"><p className="portal-feedback error" role="alert">{error}</p><button onClick={() => { setError(''); setAttempt(value => value + 1) }}>Retry loading profile</button></section> : !profile ? <p role="status">Loading your account...</p> : <section className="portal-card"><header className="portal-section-heading"><h2>Account details</h2><Status>{profile.status || 'Active'}</Status></header><dl className="portal-profile">{fields.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value || 'Not configured'}</dd></div>)}</dl>{screen === 'dashboard' && <div className="portal-actions"><Link to="/staff-portal/profile">View my profile</Link></div>}</section>}
  </main></PortalLayout>
}
