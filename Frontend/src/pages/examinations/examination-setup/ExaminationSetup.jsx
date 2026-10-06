import { Link } from 'react-router-dom'
import DashboardLayout from '../../../layouts/DashboardLayout'
import PageHeader from '../../../components/PageHeader'
import './ExaminationSetup.css'

export default function ExaminationSetup() {
  return (
    <DashboardLayout>
      <section className="examination-setup-page">
        <PageHeader title="Examination Setup" subtitle="Plan examination cycles, exam types, schedules and assessment rules." breadcrumb={['Examinations & Results', "Examination Setup"]} />
        <div className="examination-setup-page__screens">
          <Link className="examination-setup-page__screen" to="/examination-setup/examination-list">Examination List</Link>
          <Link className="examination-setup-page__screen" to="/examination-setup/create-examination">Create Examination</Link>
          <Link className="examination-setup-page__screen" to="/examination-setup/exam-type">Exam Type</Link>
          <Link className="examination-setup-page__screen" to="/examination-setup/exam-schedule">Exam Schedule</Link>
          <Link className="examination-setup-page__screen" to="/examination-setup/exam-rules">Exam Rules</Link>
        </div>
      </section>
    </DashboardLayout>
  )
}
