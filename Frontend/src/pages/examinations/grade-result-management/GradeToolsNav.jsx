import { NavLink } from 'react-router-dom'
import { FiAward, FiPercent } from 'react-icons/fi'
import './GradeToolsNav.css'

export default function GradeToolsNav() {
  return <nav className="grade-tools-nav" aria-label="Grade management tools">
    <NavLink to="/grade-result-management/grade-configuration" end><FiAward aria-hidden="true" /><span>Grade Scale Configuration</span></NavLink>
    <NavLink to="/grade-result-management/cgpa-calculator" end><FiPercent aria-hidden="true" /><span>CGPA Calculator</span></NavLink>
  </nav>
}
