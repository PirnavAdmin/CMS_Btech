import DashboardLayout from '../../layouts/DashboardLayout'
import AcademicContextSettings from '../settings/AcademicContextSettings'
import './Settings.css'

export default function Settings() {
  return (
    <DashboardLayout>
      <main className="settings-page">
        <header className="settings-page-header">
          <div>
            <h1>Settings</h1>
            <span>Configure the active College and Academic Year for the application.</span>
          </div>
        </header>

        <section className="settings-content">
          <AcademicContextSettings />
        </section>
      </main>
    </DashboardLayout>
  )
}


