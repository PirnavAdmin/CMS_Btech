import { Link } from 'react-router-dom'
import DashboardLayout from '../../../layouts/DashboardLayout'
import PageHeader from '../../../components/PageHeader'
import './EditMarks.css'

export default function EditMarks() {
  return (
    <DashboardLayout>
      <section className="marks-management-edit-marks">
        <PageHeader title="Edit Marks" breadcrumb={[{ label: "Marks Management", link: '/marks-management' }, "Edit Marks"]} />
        <div className="marks-management-edit-marks__content">
          <h2>Edit Marks</h2>
          <p>This screen is ready for implementation.</p>
          <Link to="/marks-management">Back to Marks Management</Link>
        </div>
      </section>
    </DashboardLayout>
  )
}
