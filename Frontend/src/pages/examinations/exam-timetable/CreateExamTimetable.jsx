import { Link } from 'react-router-dom'
import DashboardLayout from '../../../layouts/DashboardLayout'
import PageHeader from '../../../components/PageHeader'
import './CreateExamTimetable.css'

export default function CreateExamTimetable() {
  return (
    <DashboardLayout>
      <section className="exam-timetable-create-exam-timetable">
        <PageHeader title="Create Exam Timetable" breadcrumb={[{ label: "Exam Timetable", link: '/exam-timetable' }, "Create Exam Timetable"]} />
        <div className="exam-timetable-create-exam-timetable__content">
          <h2>Create Exam Timetable</h2>
          <p>This screen is ready for implementation.</p>
          <Link to="/exam-timetable">Back to Exam Timetable</Link>
        </div>
      </section>
    </DashboardLayout>
  )
}
