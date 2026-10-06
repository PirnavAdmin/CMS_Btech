import { Link } from 'react-router-dom'
import DashboardLayout from '../../../layouts/DashboardLayout'
import PageHeader from '../../../components/PageHeader'
import './StudentMarks.css'

export default function StudentMarks() {
  return (
    <DashboardLayout>
      <section className="marks-management-student-marks">
        <PageHeader title="Student Marks" breadcrumb={[{ label: "Marks Management", link: '/marks-management' }, "Student Marks"]} />
        <div className="marks-management-student-marks__content">
          <h2>Student Marks</h2>
          <p>This screen is ready for implementation.</p>
          <Link to="/marks-management">Back to Marks Management</Link>
        </div>
      </section>
    </DashboardLayout>
  )
}
