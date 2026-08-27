import DashboardLayout from '../../../layouts/DashboardLayout'
import './StudentPromotion.css'

export default function StudentPromotion() {
  return (
    <DashboardLayout>
      <main className="student-promotion-placeholder">
        <header>
          <span>Student Management</span>
          <h1>Student Promotion</h1>
          <p>Student semester and academic-year promotion will be available here.</p>
        </header>

        <section>
          <h2>Module under development</h2>
          <p>
            Student selection, eligibility checks and promotion into the next
            semester or academic year will be managed in this module.
          </p>
        </section>
      </main>
    </DashboardLayout>
  )
}
