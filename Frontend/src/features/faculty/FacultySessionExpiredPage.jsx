import { Link } from 'react-router-dom'
import { FiAlertCircle } from 'react-icons/fi'
import './workspace.css'

export default function FacultySessionExpiredPage() {
  return <main className="fw-session-page">
    <section className="fw-error-card" role="alert">
      <FiAlertCircle aria-hidden="true" />
      <div>
        <p className="fw-eyebrow">TEACHING FACULTY PORTAL</p>
        <h1>Your session has expired</h1>
        <p>Sign in again to continue to your teaching workspace.</p>
        <Link to="/login" className="fw-button fw-button-primary">Sign in again</Link>
      </div>
    </section>
  </main>
}
