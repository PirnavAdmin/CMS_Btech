import DashboardLayout from '../../layouts/DashboardLayout'
import './AcademicYearManagement.css'

export default function AcademicYearManagement() {
  return <DashboardLayout><div className="management-page"><div className="management-page__heading"><div><p className="management-page__eyebrow">Administration</p><h1>Academic Year Management</h1><p>Create and manage academic year periods for your institution.</p></div><button type="button">+ Add Academic Year</button></div><section className="management-card"><h2>Academic Years</h2><div className="management-empty"><span>◷</span><h3>No academic years added yet</h3><p>Add an academic year to organize courses, departments, and student records.</p></div></section></div></DashboardLayout>
}
