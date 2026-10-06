import { Link } from 'react-router-dom'
import DashboardLayout from '../../../layouts/DashboardLayout'
import PageHeader from '../../../components/PageHeader'
import './BulkMarksUpload.css'

export default function BulkMarksUpload() {
  return (
    <DashboardLayout>
      <section className="marks-management-bulk-marks-upload">
        <PageHeader title="Bulk Marks Upload" breadcrumb={[{ label: "Marks Management", link: '/marks-management' }, "Bulk Marks Upload"]} />
        <div className="marks-management-bulk-marks-upload__content">
          <h2>Bulk Marks Upload</h2>
          <p>This screen is ready for implementation.</p>
          <Link to="/marks-management">Back to Marks Management</Link>
        </div>
      </section>
    </DashboardLayout>
  )
}
