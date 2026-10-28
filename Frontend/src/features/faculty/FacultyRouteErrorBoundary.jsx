import { Component } from 'react'
import { Link } from 'react-router-dom'
import { FiAlertCircle } from 'react-icons/fi'
import PortalLayout from '../../layouts/PortalLayout.jsx'
import './workspace.css'

export default class FacultyRouteErrorBoundary extends Component {
  state = { hasError: false }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  componentDidCatch(error) {
    console.error('Faculty screen failed to render:', error)
  }

  render() {
    if (!this.state.hasError) return this.props.children
    return <PortalLayout title="Screen unavailable"><main className="portal-page fw-page"><section className="fw-error-card" role="alert"><FiAlertCircle aria-hidden="true" /><div><h2>This faculty screen could not be displayed</h2><p>Retry the screen or return to your dashboard.</p><div className="fw-inline-actions"><button type="button" className="fw-button fw-button-primary" onClick={() => this.setState({ hasError: false })}>Retry screen</button><Link to="/faculty-portal/dashboard" className="fw-button">Dashboard</Link></div></div></section></main></PortalLayout>
  }
}
