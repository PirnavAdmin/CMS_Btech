import { Link } from 'react-router-dom'
import DashboardLayout from '../../../layouts/DashboardLayout'
import PageHeader from '../../../components/PageHeader'
import MarksModuleNav from './MarksModuleNav'
import './SubjectMarksReport.css'

export default function SubjectMarksReport() {
  return (
    <DashboardLayout>
      <section className="marks-management-subject-marks-report">
        <PageHeader title="Subject Marks Report" breadcrumb={[{ label: "Marks Management", link: '/marks-management' }, "Subject Marks Report"]} />
        <MarksModuleNav />
        <div className="marks-management-subject-marks-report__content">
          <h2>Subject Marks Report</h2>
          <p>This screen is ready for implementation.</p>
          <Link to="/marks-management">Back to Marks Management</Link>
        </div>
      </section>
    </DashboardLayout>
  )
}
