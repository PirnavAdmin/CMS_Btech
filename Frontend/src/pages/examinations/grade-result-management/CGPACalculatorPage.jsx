import DashboardLayout from '../../../layouts/DashboardLayout'
import PageHeader from '../../../components/PageHeader'
import { NavLink } from 'react-router-dom'
import { useAcademic } from '../../../context/AcademicContext'
import CGPACalculator from './CGPACalculator'

export default function CGPACalculatorPage() {
  const { selectedCollegeId, selectedAcademicYearId } = useAcademic()
  const scope = `${selectedCollegeId || 'none'}:${selectedAcademicYearId || 'none'}`
  return <DashboardLayout><div className="grm grm--cgpa-page">
    <PageHeader title="CGPA Calculator" subtitle="Calculate a credit-weighted cumulative GPA across completed semesters." breadcrumb={[{ label: 'Grades System and Results', link: '/grade-result-management/grade-configuration' }, 'CGPA Calculator']} />
    <nav className="grm-nav grm-nav--grade" aria-label="Grade management tools">
      <NavLink to="/grade-result-management/grade-configuration">Grade Management</NavLink>
      <NavLink to="/grade-result-management/cgpa-calculator" end>CGPA Calculator</NavLink>
    </nav>
    <CGPACalculator key={scope} storageKey={`cms-cgpa:${scope}`} />
  </div></DashboardLayout>
}
