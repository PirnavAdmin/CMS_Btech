import { Link } from 'react-router-dom'
import DashboardLayout from '../../../layouts/DashboardLayout'
import PageHeader from '../../../components/PageHeader'
import './HallAllocation.css'

export default function HallAllocation() {
  return (
    <DashboardLayout>
      <section className="exam-timetable-hall-allocation">
        <PageHeader title="Hall Allocation" breadcrumb={[{ label: "Exam Timetable", link: '/exam-timetable' }, "Hall Allocation"]} />
        <div className="exam-timetable-hall-allocation__content">
          <h2>Hall Allocation</h2>
          <p>This screen is ready for implementation.</p>
          <Link to="/exam-timetable">Back to Exam Timetable</Link>
        </div>
      </section>
    </DashboardLayout>
  )
}
