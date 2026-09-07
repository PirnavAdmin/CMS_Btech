import { useEffect, useState } from 'react'
import { FiCheck, FiRefreshCw, FiUserPlus, FiX } from 'react-icons/fi'
import DashboardLayout from '../../layouts/DashboardLayout'
import { approveAccessRequest, getPendingAccessRequests, rejectAccessRequest } from '../../auth/authApi'
import './AccessRequests.css'

const displayDate = value => value ? new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value)) : '—'

export default function AccessRequests() {
  const [requests, setRequests] = useState([]), [loading, setLoading] = useState(true), [error, setError] = useState(''), [busy, setBusy] = useState(null)
  const load = async () => { setLoading(true); setError(''); try { setRequests(await getPendingAccessRequests()) } catch (cause) { setError(cause.message) } finally { setLoading(false) } }
  useEffect(() => { load() }, [])
  const decide = async (requestId, action) => { setBusy(requestId); setError(''); try { await (action === 'approve' ? approveAccessRequest : rejectAccessRequest)(requestId); setRequests(current => current.filter(item => item.requestId !== requestId)) } catch (cause) { setError(cause.message) } finally { setBusy(null) } }
  return <DashboardLayout><main className="access-requests"><header><div><p>Account administration</p><h1>Access Requests</h1><span>Review pending portal-registration requests.</span></div><button onClick={load} disabled={loading}><FiRefreshCw /> Refresh</button></header>{error && <p className="access-requests__error" role="alert">{error}</p>}<section className="access-requests__card"><div className="access-requests__title"><span><FiUserPlus /></span><div><h2>Pending requests</h2><p>{loading ? 'Loading requests…' : `${requests.length} request${requests.length === 1 ? '' : 's'} awaiting review`}</p></div></div>{!loading && !requests.length ? <div className="access-requests__empty">No pending access requests.</div> : <div className="access-requests__table"><table><thead><tr><th>Applicant</th><th>Email</th><th>Mobile</th><th>Requested</th><th>Status</th><th>Actions</th></tr></thead><tbody>{requests.map(item => <tr key={item.requestId}><td><strong>{item.fullName}</strong><small>Request #{item.requestId}</small></td><td>{item.email}</td><td>{item.mobile}</td><td>{displayDate(item.createdAt)}</td><td><span>Pending</span></td><td><div><button type="button" className="approve" disabled={busy === item.requestId} onClick={() => decide(item.requestId, 'approve')}><FiCheck /> Approve</button><button type="button" className="reject" disabled={busy === item.requestId} onClick={() => decide(item.requestId, 'reject')}><FiX /> Reject</button></div></td></tr>)}</tbody></table></div>}</section></main></DashboardLayout>
}
