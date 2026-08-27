import DashboardLayout from '../../../layouts/DashboardLayout'
import './StudentProfile.css'

export default function StudentProfile() {
  return (
    <DashboardLayout>
      <main className="student-profile-placeholder">
        <header>
          <span>Student Management</span>
          <h1>Student Profile</h1>
          <p>Student profile management will be available here.</p>
        </header>

        <section>
          <h2>Module under development</h2>
          <p>
            Personal information, academic records, attendance, fees,
            documents, results, certificates and activity will be managed in
            this module.
          </p>
        </section>
      </main>
    </DashboardLayout>
  )
}
