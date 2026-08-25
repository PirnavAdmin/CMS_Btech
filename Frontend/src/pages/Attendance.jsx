import DashboardLayout from '../layouts/DashboardLayout'

export default function Attendance() {
  return (
    <DashboardLayout><div className="erp-page"><header className="erp-page-heading"><div><p className="erp-eyebrow">Academic operations</p><h1>Attendance</h1><p>Review attendance records by class and date.</p></div></header><section className="erp-empty-state"><span aria-hidden="true">ATT</span><h2>No attendance records</h2><p>Attendance records will appear here.</p></section></div></DashboardLayout>
  )
}
