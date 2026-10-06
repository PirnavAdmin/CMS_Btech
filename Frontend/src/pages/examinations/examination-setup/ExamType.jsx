import { Link } from 'react-router-dom'
import DashboardLayout from '../../../layouts/DashboardLayout'
import PageHeader from '../../../components/PageHeader'
import './ExamType.css'

export default function ExamType() {
  return (
    <DashboardLayout>
      <section className="examination-setup-exam-type">
        <PageHeader title="Exam Type" breadcrumb={[{ label: "Examination Setup", link: '/examination-setup' }, "Exam Type"]} />
        <div className="examination-setup-exam-type__content">
          <h2>Exam Type</h2>
          <p>This screen is ready for implementation.</p>
          <Link to="/examination-setup">Back to Examination Setup</Link>
        </div>
      </section>
    </DashboardLayout>
  )
}
