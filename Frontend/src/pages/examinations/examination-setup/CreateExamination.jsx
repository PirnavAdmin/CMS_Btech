import { Link } from 'react-router-dom'
import DashboardLayout from '../../../layouts/DashboardLayout'
import PageHeader from '../../../components/PageHeader'
import './CreateExamination.css'

export default function CreateExamination() {
  return (
    <DashboardLayout>
      <section className="examination-setup-create-examination">
        <PageHeader title="Create Examination" breadcrumb={[{ label: "Examination Setup", link: '/examination-setup' }, "Create Examination"]} />
        <div className="examination-setup-create-examination__content">
          <h2>Create Examination</h2>
          <p>This screen is ready for implementation.</p>
          <Link to="/examination-setup">Back to Examination Setup</Link>
        </div>
      </section>
    </DashboardLayout>
  )
}
