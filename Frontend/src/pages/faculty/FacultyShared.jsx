import { FiShield } from 'react-icons/fi'

export function CapabilityNotice({ children }) {
  return <div className="faculty-capability" role="status"><FiShield aria-hidden="true" /><span>{children}</span></div>
}

export function FacultyHeader({ children, title = 'Faculty Management', subtitle = 'Manage faculty records, academic assignments and employment status.' }) {
  return <header className="erp-page-heading faculty-header"><div><p className="erp-eyebrow">Academic resources</p><h1>{title}</h1><p className="erp-page-subtitle">{subtitle}</p></div>{children && <div className="erp-page-actions">{children}</div>}</header>
}

export function InfoField({ label, value }) {
  if (value === undefined || value === null || String(value).trim() === '') return null
  return <div><dt>{label}</dt><dd>{value}</dd></div>
}
