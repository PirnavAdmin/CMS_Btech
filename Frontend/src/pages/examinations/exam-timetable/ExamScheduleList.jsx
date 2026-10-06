import { Link } from 'react-router-dom'
import DashboardLayout from '../../../layouts/DashboardLayout'
import PageHeader from '../../../components/PageHeader'
import './ExamScheduleList.css'

export default function ExamScheduleList() {
  return (
    <DashboardLayout>
      <section className="exam-timetable-exam-schedule-list">
        <PageHeader title="Exam Schedule List" breadcrumb={[{ label: "Exam Timetable", link: '/exam-timetable' }, "Exam Schedule List"]} />
        <div className="exam-timetable-exam-schedule-list__content">
          <h2>Exam Schedule List</h2>
          <p>This screen is ready for implementation.</p>
          <Link to="/exam-timetable">Back to Exam Timetable</Link>
        </div>
      </section>
    </DashboardLayout>
  )
}
