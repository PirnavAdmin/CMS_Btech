import { Link } from 'react-router-dom'
import DashboardLayout from '../../../layouts/DashboardLayout'
import PageHeader from '../../../components/PageHeader'
import './StudentResult.css'

export default function StudentResult() {
  return (
    <DashboardLayout>
      <section className="grade-result-management-student-result">
        <PageHeader title="Student Result" breadcrumb={[{ label: "Grade System & Result Management", link: '/grade-result-management' }, "Student Result"]} />
        <div className="grade-result-management-student-result__content">
          <h2>Student Result</h2>
          <p>This screen is ready for implementation.</p>
          <Link to="/grade-result-management">Back to Grade System &amp; Result Management</Link>
        </div>
      </section>
    </DashboardLayout>
  )
}
