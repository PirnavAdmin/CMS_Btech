import { Link } from 'react-router-dom'
import DashboardLayout from '../../../layouts/DashboardLayout'
import PageHeader from '../../../components/PageHeader'
import './ExamRules.css'

export default function ExamRules() {
  return (
    <DashboardLayout>
      <section className="examination-setup-exam-rules">
        <PageHeader title="Exam Rules" breadcrumb={[{ label: "Examination Setup", link: '/examination-setup' }, "Exam Rules"]} />
        <div className="examination-setup-exam-rules__content">
          <h2>Exam Rules</h2>
          <p>This screen is ready for implementation.</p>
          <Link to="/examination-setup">Back to Examination Setup</Link>
        </div>
      </section>
    </DashboardLayout>
  )
}
