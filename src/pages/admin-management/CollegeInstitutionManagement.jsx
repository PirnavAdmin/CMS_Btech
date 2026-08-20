import DashboardLayout from '../../layouts/DashboardLayout'
import './CollegeInstitutionManagement.css'

export default function CollegeInstitutionManagement() {
  return (
    <DashboardLayout>
      <div className="management-page">
        <div className="management-page__heading"><div><p className="management-page__eyebrow">Administration</p><h1>College / Institution Management</h1><p>Maintain the primary details of your college or institution.</p></div><button type="button">+ Add Institution</button></div>
        <section className="management-card"><h2>Institution Details</h2><div className="management-empty"><span>⌂</span><h3>No institution details added yet</h3><p>Add your institution information to begin managing your campus.</p></div></section>
      </div>
    </DashboardLayout>
  )
}
