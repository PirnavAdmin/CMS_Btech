import { Link } from 'react-router-dom'
import './FacultyComponents.css'

export default function FacultyBreadcrumbs({ crumbs = [] }) {
  return (
    <nav aria-label="Breadcrumb" className="faculty-breadcrumbs">
      <span className="faculty-breadcrumb-brand">Digital Campus</span>
      <span className="faculty-breadcrumb-sep" aria-hidden="true">/</span>
      <Link to="/faculty-portal/dashboard" className="faculty-breadcrumb-portal">Teaching Faculty</Link>
      {crumbs.map((crumb, idx) => (
        <span key={idx} className="faculty-breadcrumb-item">
          <span className="faculty-breadcrumb-sep" aria-hidden="true">/</span>
          {crumb.path ? (
            <Link to={crumb.path} className="faculty-breadcrumb-link">{crumb.label}</Link>
          ) : (
            <span className="faculty-breadcrumb-current" aria-current="page">{crumb.label}</span>
          )}
        </span>
      ))}
    </nav>
  )
}
