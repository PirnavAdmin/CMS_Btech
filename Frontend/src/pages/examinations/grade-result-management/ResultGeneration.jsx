import { Link } from 'react-router-dom'
import DashboardLayout from '../../../layouts/DashboardLayout'
import PageHeader from '../../../components/PageHeader'
import './ResultGeneration.css'

export default function ResultGeneration() {
  return (
    <DashboardLayout>
      <section className="grade-result-management-result-generation">
        <PageHeader title="Result Generation" breadcrumb={[{ label: "Grade System & Result Management", link: '/grade-result-management' }, "Result Generation"]} />
        <div className="grade-result-management-result-generation__content">
          <h2>Result Generation</h2>
          <p>This screen is ready for implementation.</p>
          <Link to="/grade-result-management">Back to Grade System &amp; Result Management</Link>
        </div>
      </section>
    </DashboardLayout>
  )
}
