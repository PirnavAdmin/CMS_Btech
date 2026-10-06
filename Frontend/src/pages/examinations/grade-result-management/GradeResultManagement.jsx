import { Link } from 'react-router-dom'
import DashboardLayout from '../../../layouts/DashboardLayout'
import PageHeader from '../../../components/PageHeader'
import './GradeResultManagement.css'

export default function GradeResultManagement() {
  return (
    <DashboardLayout>
      <section className="grade-result-management-page">
        <PageHeader title="Grade System & Result Management" subtitle="Configure grading bands and prepare student result records." breadcrumb={['Examinations & Results', "Grade System & Result Management"]} />
        <div className="grade-result-management-page__screens">
          <Link className="grade-result-management-page__screen" to="/grade-result-management/grade-configuration">Grade Configuration</Link>
          <Link className="grade-result-management-page__screen" to="/grade-result-management/result-generation">Result Generation</Link>
          <Link className="grade-result-management-page__screen" to="/grade-result-management/student-result">Student Result</Link>
        </div>
      </section>
    </DashboardLayout>
  )
}
