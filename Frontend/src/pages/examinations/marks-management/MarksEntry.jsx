import { Link } from 'react-router-dom'
import DashboardLayout from '../../../layouts/DashboardLayout'
import PageHeader from '../../../components/PageHeader'
import './MarksEntry.css'

export default function MarksEntry() {
  return (
    <DashboardLayout>
      <section className="marks-management-marks-entry">
        <PageHeader title="Marks Entry" breadcrumb={[{ label: "Marks Management", link: '/marks-management' }, "Marks Entry"]} />
        <div className="marks-management-marks-entry__content">
          <h2>Marks Entry</h2>
          <p>This screen is ready for implementation.</p>
          <Link to="/marks-management">Back to Marks Management</Link>
        </div>
      </section>
    </DashboardLayout>
  )
}
