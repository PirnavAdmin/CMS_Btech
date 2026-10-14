import { Link } from 'react-router-dom'

export default function Unauthorized() {
  return (
    <div className="erp-message-page">
      <section className="erp-message-card">
        <span className="erp-message-code">403</span>
        <p className="erp-eyebrow">Access restricted</p>
        <h1>You cannot open this page</h1>
        <p>Your current role does not have permission to use this module.</p>
        <Link className="erp-primary-link" to="/dashboard">Return to dashboard</Link>
      </section>
    </div>
  )
}
