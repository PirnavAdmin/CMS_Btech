import { Link } from 'react-router-dom'
import DashboardLayout from '../../../layouts/DashboardLayout'
import PageHeader from '../../../components/PageHeader'
import './ExaminationList.css'

export default function ExaminationList() {
  return (
    <DashboardLayout>
      <section className="examination-setup-examination-list">
        <PageHeader title="Examination List" breadcrumb={[{ label: "Examination Setup", link: '/examination-setup' }, "Examination List"]} />
        <div className="examination-setup-examination-list__content">
          <h2>Examination List</h2>
          <p>This screen is ready for implementation.</p>
          <Link to="/examination-setup">Back to Examination Setup</Link>
        </div>
      </section>
    </DashboardLayout>
  )
}
