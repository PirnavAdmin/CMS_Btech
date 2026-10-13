import { NavLink } from 'react-router-dom'
import {
  FiBarChart2,
  FiCheckSquare,
  FiEdit3,
  FiUploadCloud,
  FiUser,
} from 'react-icons/fi'
import './MarksModuleNav.css'

const modules = [
  { label: 'Marks Entry', description: 'Record assessments', to: '/marks-management/marks-entry', icon: FiEdit3 },
  { label: 'Bulk Marks Upload', description: 'Preview a marks file', to: '/marks-management/bulk-marks-upload', icon: FiUploadCloud },
  { label: 'Student Marks', description: 'Review one student', to: '/marks-management/student-marks', icon: FiUser },
  { label: 'Subject Marks Report', description: 'Compare performance', to: '/marks-management/subject-marks-report', icon: FiBarChart2 },
  { label: 'Marks Approval', description: 'Verify submissions', to: '/marks-management/marks-approval', icon: FiCheckSquare },
]

export default function MarksModuleNav() {
  return (
    <nav className="marks-module-nav" aria-label="Marks management workflows">
      {modules.map(({ label, description, to, icon: Icon }) => (
        <NavLink
          key={to}
          to={to}
          className={({ isActive }) => `marks-module-nav__link${isActive ? ' active' : ''}`}
        >
          <span className="marks-module-nav__icon" aria-hidden="true"><Icon /></span>
          <span className="marks-module-nav__copy">
            <strong>{label}</strong>
            <small>{description}</small>
          </span>
        </NavLink>
      ))}
    </nav>
  )
}
