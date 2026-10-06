import { Link } from 'react-router-dom'
import DashboardLayout from '../../../layouts/DashboardLayout'
import PageHeader from '../../../components/PageHeader'
import './ExamTimetable.css'

export default function ExamTimetable() {
  return (
    <DashboardLayout>
      <section className="exam-timetable-page">
        <PageHeader title="Exam Timetable" subtitle="Coordinate exam sessions, department schedules and hall allocations." breadcrumb={['Examinations & Results', "Exam Timetable"]} />
        <div className="exam-timetable-page__screens">
          <Link className="exam-timetable-page__screen" to="/exam-timetable/create-exam-timetable">Create Exam Timetable</Link>
          <Link className="exam-timetable-page__screen" to="/exam-timetable/exam-schedule-list">Exam Schedule List</Link>
          <Link className="exam-timetable-page__screen" to="/exam-timetable/department-exam-schedule">Department Exam Schedule</Link>
          <Link className="exam-timetable-page__screen" to="/exam-timetable/student-exam-schedule">Student Exam Schedule</Link>
          <Link className="exam-timetable-page__screen" to="/exam-timetable/hall-allocation">Hall Allocation</Link>
        </div>
      </section>
    </DashboardLayout>
  )
}
