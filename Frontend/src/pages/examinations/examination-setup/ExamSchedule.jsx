import { Link } from 'react-router-dom'
import DashboardLayout from '../../../layouts/DashboardLayout'
import PageHeader from '../../../components/PageHeader'
import './ExamSchedule.css'

export default function ExamSchedule() {
  return (
    <DashboardLayout>
      <section className="examination-setup-exam-schedule">
        <PageHeader title="Exam Schedule" breadcrumb={[{ label: "Examination Setup", link: '/examination-setup' }, "Exam Schedule"]} />
        <div className="examination-setup-exam-schedule__content">
          <h2>Exam Schedule</h2>
          <p>This screen is ready for implementation.</p>
          <Link to="/examination-setup">Back to Examination Setup</Link>
        </div>
      </section>
    </DashboardLayout>
  )
}
