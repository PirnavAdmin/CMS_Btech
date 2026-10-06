import { Link } from 'react-router-dom'
import DashboardLayout from '../../../layouts/DashboardLayout'
import PageHeader from '../../../components/PageHeader'
import './DepartmentExamSchedule.css'

export default function DepartmentExamSchedule() {
  return (
    <DashboardLayout>
      <section className="exam-timetable-department-exam-schedule">
        <PageHeader title="Department Exam Schedule" breadcrumb={[{ label: "Exam Timetable", link: '/exam-timetable' }, "Department Exam Schedule"]} />
        <div className="exam-timetable-department-exam-schedule__content">
          <h2>Department Exam Schedule</h2>
          <p>This screen is ready for implementation.</p>
          <Link to="/exam-timetable">Back to Exam Timetable</Link>
        </div>
      </section>
    </DashboardLayout>
  )
}
