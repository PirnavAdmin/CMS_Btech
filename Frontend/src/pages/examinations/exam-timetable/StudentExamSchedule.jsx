import { Link } from 'react-router-dom'
import DashboardLayout from '../../../layouts/DashboardLayout'
import PageHeader from '../../../components/PageHeader'
import './StudentExamSchedule.css'

export default function StudentExamSchedule() {
  return (
    <DashboardLayout>
      <section className="exam-timetable-student-exam-schedule">
        <PageHeader title="Student Exam Schedule" breadcrumb={[{ label: "Exam Timetable", link: '/exam-timetable' }, "Student Exam Schedule"]} />
        <div className="exam-timetable-student-exam-schedule__content">
          <h2>Student Exam Schedule</h2>
          <p>This screen is ready for implementation.</p>
          <Link to="/exam-timetable">Back to Exam Timetable</Link>
        </div>
      </section>
    </DashboardLayout>
  )
}
