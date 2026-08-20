import DashboardLayout from '../../layouts/DashboardLayout'
import './DepartmentManagement.css'

export default function DepartmentManagement() {
  return <DashboardLayout><div className="management-page"><div className="management-page__heading"><div><p className="management-page__eyebrow">Administration</p><h1>Department Management</h1><p>Set up and maintain academic departments across your institution.</p></div><button type="button">+ Add Department</button></div><section className="management-card"><h2>Departments</h2><div className="management-empty"><span>⌘</span><h3>No departments added yet</h3><p>Add departments to organize faculty, courses, and branches.</p></div></section></div></DashboardLayout>
}
