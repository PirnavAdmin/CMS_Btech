import { Link } from 'react-router-dom'
import { FiBookOpen, FiLogIn, FiArrowLeft } from 'react-icons/fi'
import campusHero from '../assets/college-campus-hero.png'
import './Login.css'

// Deliberately does not parse or persist an activation token: the current API
// contract has no token-validation or first-time-password endpoint.
export default function ActivateAccount() {
  return <main className="admin-login pirnav-login">
    <section className="login-intro pirnav-login__campus" aria-label="Pirnav Engineering College digital campus">
      <img className="pirnav-login__campus-image" src={campusHero} alt="Pirnav Engineering College campus" />
      <div className="pirnav-login__campus-shade" />
      <div className="login-intro__content"><header className="brand"><span className="brand__mark"><FiBookOpen /></span><span className="brand__name"><strong>Pirnav Engineering College</strong><small>Digital Campus Management Portal</small></span></header></div>
    </section>
    <section className="login-panel">
      <div className="login-form recovery-success" role="status">
        <div className="pirnav-form-brand"><span><FiBookOpen /></span><div><strong>Pirnav Engineering College</strong><small>Digital Campus Management Portal</small></div></div>
        <header><h2>Account activation</h2><p>Backend support for first-time account activation and password setup is required.</p></header>
        <p className="access-note">No activation-token validation, activation OTP, or unauthenticated password-set API is currently available. Please contact the college administration.</p>
        <Link className="sign-in-button" to="/login"><FiLogIn /> Go to Login</Link>
        <Link className="text-button back-to-login" to="/login"><FiArrowLeft /> Back to Sign In</Link>
      </div>
    </section>
  </main>
}
