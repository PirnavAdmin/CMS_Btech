import DashboardLayout from '../../layouts/DashboardLayout'
import './CourseBranchManagement.css'

export default function CourseBranchManagement() {
  return <DashboardLayout><div className="management-page"><div className="management-page__heading"><div><p className="management-page__eyebrow">Administration</p><h1>Course &amp; Branch Management</h1><p>Manage the courses and branches offered by your institution.</p></div><button type="button">+ Add Course / Branch</button></div><section className="management-card"><h2>Courses &amp; Branches</h2><div className="management-empty"><span>▣</span><h3>No courses or branches added yet</h3><p>Add a course or branch to build your academic structure.</p></div></section></div></DashboardLayout>
}
