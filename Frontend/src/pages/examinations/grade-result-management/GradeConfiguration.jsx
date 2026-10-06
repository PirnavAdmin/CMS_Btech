import { Link } from 'react-router-dom'
import DashboardLayout from '../../../layouts/DashboardLayout'
import PageHeader from '../../../components/PageHeader'
import './GradeConfiguration.css'

export default function GradeConfiguration() {
  return (
    <DashboardLayout>
      <section className="grade-result-management-grade-configuration">
        <PageHeader title="Grade Configuration" breadcrumb={[{ label: "Grade System & Result Management", link: '/grade-result-management' }, "Grade Configuration"]} />
        <div className="grade-result-management-grade-configuration__content">
          <h2>Grade Configuration</h2>
          <p>This screen is ready for implementation.</p>
          <Link to="/grade-result-management">Back to Grade System &amp; Result Management</Link>
        </div>
      </section>
    </DashboardLayout>
  )
}
