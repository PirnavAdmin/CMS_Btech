import { Link } from 'react-router-dom'
import DashboardLayout from '../../../layouts/DashboardLayout'
import PageHeader from '../../../components/PageHeader'
import './MarksApproval.css'

export default function MarksApproval() {
  return (
    <DashboardLayout>
      <section className="marks-management-marks-approval">
        <PageHeader title="Marks Approval" breadcrumb={[{ label: "Marks Management", link: '/marks-management' }, "Marks Approval"]} />
        <div className="marks-management-marks-approval__content">
          <h2>Marks Approval</h2>
          <p>This screen is ready for implementation.</p>
          <Link to="/marks-management">Back to Marks Management</Link>
        </div>
      </section>
    </DashboardLayout>
  )
}
