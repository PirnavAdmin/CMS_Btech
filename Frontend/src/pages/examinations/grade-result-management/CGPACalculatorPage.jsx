import DashboardLayout from '../../../layouts/DashboardLayout'
import PageHeader from '../../../components/PageHeader'
import GradeToolsNav from './GradeToolsNav'
import { useAcademic } from '../../../context/AcademicContext'
import CGPACalculator from './CGPACalculator'

export default function CGPACalculatorPage() {
  const { selectedCollegeId, selectedAcademicYearId } = useAcademic()
  const scope = `${selectedCollegeId || 'none'}:${selectedAcademicYearId || 'none'}`
  return <DashboardLayout><div className="grm grm--cgpa-page">
    <PageHeader title="CGPA Calculator" subtitle="Calculate a credit-weighted cumulative GPA across completed semesters." breadcrumb={[{ label: 'Grades System and Results', link: '/grade-result-management/grade-configuration' }, 'CGPA Calculator']} />
    <GradeToolsNav />
    <CGPACalculator key={scope} storageKey={`cms-cgpa:${scope}`} />
  </div></DashboardLayout>
}
