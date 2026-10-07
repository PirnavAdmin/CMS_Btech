import { NavLink } from 'react-router-dom'
import './MarksModuleNav.css'

const modules = [
  ['Marks Entry', '/marks-management/marks-entry'],
  ['Bulk Marks Upload', '/marks-management/bulk-marks-upload'],
  ['Student Marks', '/marks-management/student-marks'],
  ['Subject Marks Report', '/marks-management/subject-marks-report'],
  ['Marks Approval', '/marks-management/marks-approval'],
]

export default function MarksModuleNav() {
  return <nav className="marks-module-nav" aria-label="Marks management modules">
    {modules.map(([label, to]) => <NavLink key={to} to={to} className={({ isActive }) => `marks-module-nav__link${isActive ? ' active' : ''}`}>{label}</NavLink>)}
  </nav>
}
