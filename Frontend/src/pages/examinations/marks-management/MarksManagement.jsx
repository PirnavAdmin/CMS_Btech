import { Link } from 'react-router-dom'
import DashboardLayout from '../../../layouts/DashboardLayout'
import PageHeader from '../../../components/PageHeader'
import './MarksManagement.css'

export default function MarksManagement() {
  return (
    <DashboardLayout>
      <section className="marks-management-page">
        <PageHeader title="Marks Management" subtitle="Maintain student scores, import marks and review assessment records." breadcrumb={['Examinations & Results', "Marks Management"]} />
        <div className="marks-management-page__screens">
          <Link className="marks-management-page__screen" to="/marks-management/marks-entry">Marks Entry</Link>
          <Link className="marks-management-page__screen" to="/marks-management/bulk-marks-upload">Bulk Marks Upload</Link>
          <Link className="marks-management-page__screen" to="/marks-management/edit-marks">Edit Marks</Link>
          <Link className="marks-management-page__screen" to="/marks-management/student-marks">Student Marks</Link>
          <Link className="marks-management-page__screen" to="/marks-management/subject-marks-report">Subject Marks Report</Link>
          <Link className="marks-management-page__screen" to="/marks-management/marks-approval">Marks Approval</Link>
        </div>
      </section>
    </DashboardLayout>
  )
}
